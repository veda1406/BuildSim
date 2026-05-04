from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(
    prefix="/project",
    tags=["project"]
)

class ProjectSimulationRequest(BaseModel):
    floors: int
    area: float
    weather_delay: int
    material_delay: int
    labor_delay: int
    elapsed_day: int = 0

class Stage(BaseModel):
    name: str
    start: int
    end: int

class ProjectSimulationResponse(BaseModel):
    base_duration: int
    total_delay: int
    final_duration: int
    current_stage: str
    stages: List[Stage]

@router.post("/simulate-timeline", response_model=ProjectSimulationResponse)
def simulate_timeline(req: ProjectSimulationRequest):
    # Base construction durations logic
    # Foundation = 10 days
    # Structure = floors * 15 days
    # Floors = floors * 10 days
    # Walls = floors * 8 days
    # Facade = floors * 6 days
    
    stages_info = [
        {"name": "Foundation", "duration": 10},
        {"name": "Structure", "duration": req.floors * 15},
        {"name": "Floors", "duration": req.floors * 10},
        {"name": "Walls", "duration": req.floors * 8},
        {"name": "Facade", "duration": req.floors * 6},
    ]
    
    base_duration = sum(s["duration"] for s in stages_info)
    total_delay = req.weather_delay + req.material_delay + req.labor_delay
    final_duration = base_duration + total_delay
    
    stages = []
    current_time = 0
    
    for s in stages_info:
        # Distribute delay proportionally to keep it realistic
        stage_delay = int((s["duration"] / base_duration) * total_delay) if base_duration > 0 else 0
        actual_duration = s["duration"] + stage_delay
        
        stages.append(Stage(
            name=s["name"],
            start=current_time,
            end=current_time + actual_duration
        ))
        current_time += actual_duration
        
    # Handle rounding error where sum of actual_durations != final_duration
    if stages:
        diff = final_duration - stages[-1].end
        stages[-1].end += diff

    # Determine current stage based on elapsed day
    current_stage_name = "Completed" if req.elapsed_day >= final_duration else ""
    for s in stages:
        if s.start <= req.elapsed_day < s.end:
            current_stage_name = s.name
            break
            
    if req.elapsed_day == 0 and stages:
        current_stage_name = stages[0].name

    return ProjectSimulationResponse(
        base_duration=base_duration,
        total_delay=total_delay,
        final_duration=final_duration,
        current_stage=current_stage_name,
        stages=stages
    )

class CostCalculationRequest(BaseModel):
    floors: int
    area: float

class CostCalculationResponse(BaseModel):
    structure_cost: float
    wall_cost: float
    facade_cost: float
    mep_cost: float
    total_cost: float

@router.post("/calculate-cost", response_model=CostCalculationResponse)
def calculate_cost(req: CostCalculationRequest):
    structure_cost = req.area * req.floors * 1500
    wall_cost = req.area * req.floors * 800
    facade_cost = req.area * req.floors * 600
    mep_cost = req.area * req.floors * 500
    total_cost = structure_cost + wall_cost + facade_cost + mep_cost
    
    return CostCalculationResponse(
        structure_cost=structure_cost,
        wall_cost=wall_cost,
        facade_cost=facade_cost,
        mep_cost=mep_cost,
        total_cost=total_cost
    )

# ─── What-If Scenario Simulation ─────────────────────────────────────────────

class ScenarioRequest(BaseModel):
    footprint_area: float                   # m² from model bounding box
    number_of_floors: int
    total_wall_length: float = 0            # optional, metres
    number_of_structural_elements: int = 0  # optional
    # Scenario knobs
    workers: float
    budget_multiplier: float = 1.0          # 1.0 = baseline; 1.2 = +20% budget
    delay_weather_days: float = 0
    delay_material_days: float = 0

class ScenarioResponse(BaseModel):
    built_area: float
    base_duration_days: float
    base_cost: float
    base_workers: float
    final_duration: float
    final_cost: float
    labor_cost: float
    material_cost: float
    delta_duration: float
    delta_cost: float

@router.post("/simulate-scenario", response_model=ScenarioResponse)
def simulate_scenario(req: ScenarioRequest):
    # ── Configurable constants ─────────────────────────────────────────────
    PRODUCTIVITY_PER_WORKER = 0.25   # m²/day per worker
    MATERIAL_RATE           = 1200.0 # ₹ per m²
    WAGE_PER_DAY            = 800.0  # ₹ per worker per day

    # Step 1 – Total built area
    built_area = req.footprint_area * req.number_of_floors

    # Step 2 – Base workers & base duration (productivity model)
    base_workers = max(10.0, built_area / 50.0)
    base_duration_days = built_area / (base_workers * PRODUCTIVITY_PER_WORKER)

    # Baseline cost (workers = base_workers, no delays, budget = 1.0)
    base_material_cost = built_area * MATERIAL_RATE
    base_labor_cost    = base_workers * WAGE_PER_DAY * base_duration_days
    base_cost          = base_material_cost + base_labor_cost

    # Step 3 – Worker effect with diminishing returns
    worker_ratio       = req.workers / base_workers
    efficiency_factor  = 1.0 - 0.3 * (worker_ratio - 1.0) ** 2
    efficiency_factor  = max(0.5, min(1.0, efficiency_factor))
    effective_workers  = req.workers * efficiency_factor

    # Step 4 – Budget efficiency boost
    efficiency_boost  = 1.0 + 0.1 * (req.budget_multiplier - 1.0)
    efficiency_boost  = min(1.2, efficiency_boost)          # upper cap only
    effective_workers = effective_workers * efficiency_boost

    # Duration after worker & budget adjustments
    duration = built_area / (effective_workers * PRODUCTIVITY_PER_WORKER)

    # Step 5 – Apply delays
    duration += req.delay_weather_days + req.delay_material_days

    # Step 7 – Stability clamp
    duration = max(0.6 * base_duration_days, min(2.5 * base_duration_days, duration))

    # Step 6 – Split cost: material (area-based) + labor (workers × wage × time)
    material_cost = built_area * MATERIAL_RATE
    labor_cost    = req.workers * WAGE_PER_DAY * duration
    total_cost    = material_cost + labor_cost

    return ScenarioResponse(
        built_area=round(built_area, 2),
        base_duration_days=round(base_duration_days, 1),
        base_cost=round(base_cost, 2),
        base_workers=round(base_workers, 1),
        final_duration=round(duration, 1),
        final_cost=round(total_cost, 2),
        labor_cost=round(labor_cost, 2),
        material_cost=round(material_cost, 2),
        delta_duration=round(duration - base_duration_days, 1),
        delta_cost=round(total_cost - base_cost, 2),
    )
