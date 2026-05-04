from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# Create the database tables
Base.metadata.create_all(bind=engine)

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

from routers import tasks, auth, project
app.include_router(tasks.router)
app.include_router(auth.router)
app.include_router(project.router)
