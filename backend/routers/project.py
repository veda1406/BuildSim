from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math

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
    simulation_speed: Optional[float] = 1.0
    playback_state: Optional[str] = "paused"
    structural_material: Optional[str] = "Concrete"
    uploadedModel: Optional[Dict[str, Any]] = None

class Stage(BaseModel):
    name: str
    start: int
    end: int

class GeometryMetrics(BaseModel):
    footprint: float
    floors: int
    columns: int
    beams: int
    walls: float
    facade_perimeter: float
    room_density: float
    slab_area: float
    structural_density: float
    openings_complexity: float

class ProjectSimulationResponse(BaseModel):
    base_duration: int
    total_delay: int
    final_duration: int
    current_stage: str
    stages: List[Stage]
    
    # Centralized simulation state
    currentDay: int
    totalDays: int
    normalizedProgress: float
    activePhase: str
    phaseProgress: float
    phaseBreakdown: List[Stage]
    simulationSpeed: float
    playbackState: str
    
    # Extracted geometry metrics
    extracted_metrics: GeometryMetrics

def extract_metrics_from_model(uploadedModel: Optional[Dict[str, Any]], floors: int, area: float) -> GeometryMetrics:
    if not uploadedModel or "elements" not in uploadedModel:
        # Fallback procedural estimate when no DXF is uploaded
        footprint = area
        floor_count = floors
        
        columns = floor_count * 16
        beams = int(columns * 1.4)
        walls = float(floor_count * 120)
        facade_perimeter = float(4 * math.sqrt(footprint))
        slab_area = float(footprint * (floor_count + 1))
        
        room_count = floor_count * 4
        room_density = float(room_count / footprint) if footprint > 0 else 0.04
        structural_density = 0.15
        openings_complexity = 0.3
    else:
        elements = uploadedModel.get("elements", [])
        
        # Area/Footprint
        footprint = float(uploadedModel.get("area", area))
        if footprint <= 0:
            footprint = area
            
        floor_count = int(uploadedModel.get("num_stories", floors))
        
        # Columns count
        columns = sum(1 for e in elements if e.get("type") == "column")
        if columns == 0:
            columns = floor_count * 16
            
        # Beams count (procedural estimate or actual if type is beam)
        beams = sum(1 for e in elements if e.get("type") == "beam")
        if beams == 0:
            beams = int(columns * 1.4)
            
        # Walls length
        walls = float(uploadedModel.get("wall_length", 0))
        if walls <= 0:
            walls = sum(e.get("size", [0])[0] for e in elements if (e.get("type") == "wall" or e.get("layer") == "walls") and "size" in e)
        if walls <= 0:
            walls = float(floor_count * 120)
            
        # Facade perimeter
        facade_perimeter = float(uploadedModel.get("facade_perimeter", 0))
        if facade_perimeter <= 0:
            xs = [e["position"][0] for e in elements if "position" in e]
            zs = [e["position"][2] for e in elements if "position" in e]
            if xs and zs:
                width = max(xs) - min(xs)
                depth = max(zs) - min(zs)
                facade_perimeter = float(2 * (width + depth))
            else:
                facade_perimeter = float(4 * math.sqrt(footprint))
                
        # Slab area
        slab_area = sum(e.get("size", [0, 0, 0])[0] * e.get("size", [0, 0, 0])[2] for e in elements if e.get("type") == "slab" and "size" in e)
        if slab_area <= 0:
            slab_area = footprint * (floor_count + 1)
            
        # Rooms density
        rooms = uploadedModel.get("rooms", [])
        room_count = len(rooms)
        if room_count == 0:
            room_count = floor_count * 4
        room_density = float(room_count / footprint) if footprint > 0 else 0.04
        
        # Structural density
        struct_elements = [e for e in elements if e.get("layer") == "structure" or e.get("type") in ["column", "core", "wall"] or e.get("layer") == "walls"]
        struct_volume = sum(e.get("size", [0,0,0])[0] * e.get("size", [0,0,0])[1] * e.get("size", [0,0,0])[2] for e in struct_elements if "size" in e)
        
        heights = [e["position"][1] + e.get("size", [0,0,0])[1]/2 for e in elements if "position" in e and "size" in e]
        building_height = max(heights) if heights else 3.0
        building_volume = footprint * building_height
        structural_density = float(min(1.0, struct_volume / building_volume)) if building_volume > 0 else 0.15
        
        # Window count for openings complexity
        windows_count = sum(1 for e in elements if e.get("type") == "window" or (e.get("layer") == "facade" and e.get("color") == "#88ccff"))
        openings_complexity = float(min(1.0, windows_count / (columns + 1))) if columns > 0 else 0.3
        
    return GeometryMetrics(
        footprint=round(footprint, 2),
        floors=floor_count,
        columns=columns,
        beams=beams,
        walls=round(walls, 2),
        facade_perimeter=round(facade_perimeter, 2),
        room_density=round(room_density, 4),
        slab_area=round(slab_area, 2),
        structural_density=round(structural_density, 3),
        openings_complexity=round(openings_complexity, 3)
    )

@router.post("/simulate-timeline", response_model=ProjectSimulationResponse)
def simulate_timeline(req: ProjectSimulationRequest):
    # Extract geometry-derived metrics
    metrics = extract_metrics_from_model(req.uploadedModel, req.floors, req.area)
    
    # Calculate phase durations using the dynamic, metric-driven formulas
    foundation_duration = int(10 + metrics.footprint * 0.02)
    structural_duration = int(metrics.floors * (10 + (metrics.columns + metrics.beams) / metrics.floors * 0.73))
    slab_duration = int((metrics.slab_area * 0.018) + (metrics.floors * 2.5))
    wall_duration = int(metrics.walls * 0.10) + 3
    facade_duration = int(metrics.facade_perimeter * 0.18) + int(metrics.columns * 0.15)
    
    # Scale structural phases based on structural material speed characteristics
    material_multiplier = 1.0
    if req.structural_material == "Concrete":
        material_multiplier = 1.35
    elif req.structural_material == "Steel":
        material_multiplier = 0.70
    elif req.structural_material == "Wood":
        material_multiplier = 0.85
        
    structural_duration = int(structural_duration * material_multiplier)
    slab_duration = int(slab_duration * material_multiplier)
    
    stages_info = [
        {"name": "Foundation", "duration": max(5, foundation_duration)},
        {"name": "Structure", "duration": max(10, structural_duration)},
        {"name": "Floors", "duration": max(10, slab_duration)},
        {"name": "Walls", "duration": max(10, wall_duration)},
        {"name": "Facade", "duration": max(5, facade_duration)},
    ]
    
    base_duration = sum(s["duration"] for s in stages_info)
    total_delay = req.weather_delay + req.material_delay + req.labor_delay
    final_duration = base_duration + total_delay
    
    stages = []
    current_time = 0
    
    for s in stages_info:
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
        
    # Calculate phase-specific progress
    phase_progress = 0.0
    for s in stages:
        if s.start <= req.elapsed_day < s.end:
            phase_duration = s.end - s.start
            if phase_duration > 0:
                phase_progress = float(req.elapsed_day - s.start) / phase_duration
            break
            
    normalized_progress = float(min(req.elapsed_day, final_duration)) / final_duration if final_duration > 0 else 0.0

    return ProjectSimulationResponse(
        base_duration=base_duration,
        total_delay=total_delay,
        final_duration=final_duration,
        current_stage=current_stage_name,
        stages=stages,
        
        # Centralized simulation state
        currentDay=req.elapsed_day,
        totalDays=final_duration,
        normalizedProgress=normalized_progress,
        activePhase=current_stage_name,
        phaseProgress=phase_progress,
        phaseBreakdown=stages,
        simulationSpeed=req.simulation_speed,
        playbackState=req.playback_state,
        
        # Extracted metrics
        extracted_metrics=metrics
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
