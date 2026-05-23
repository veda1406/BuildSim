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

import os

app = FastAPI(title="BuildSim Simulation Engine API")

# Dynamic CORS setup allowing local testing and production Vercel frontend domains
frontend_url = os.environ.get("FRONTEND_URL")
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if frontend_url:
    origins.append(frontend_url)
else:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
