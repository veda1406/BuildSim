from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
import models

# Ensure tables exist, but do NOT drop them to preserve data
Base.metadata.create_all(bind=engine)

# Ensure a default project exists for the single-session model
db = SessionLocal()
try:
    default_project = db.query(models.Project).filter(models.Project.id == 1).first()
    if not default_project:
        project = models.Project(
            id=1,
            name="Current Session",
            area=0,
            floors=0,
            cost_rate=150,
            floor_multiplier=50000,
            estimated_budget=0,
            final_budget=0,
            is_overridden=False,
            total_days=100
        )
        db.add(project)
        db.commit()
    
    # Remove any other projects (cleaning demo data)
    db.query(models.Project).filter(models.Project.id != 1).delete()
    db.commit()
finally:
    db.close()

app = FastAPI(title="BuildSim Simulation Engine API")

# CORS setup for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "BuildSim Backend Running"}

from routers import tasks, auth, project, projects
app.include_router(tasks.router)
app.include_router(auth.router)
app.include_router(project.router)
app.include_router(projects.router)
