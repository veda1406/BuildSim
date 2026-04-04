from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import models, schemas, cpm_engine, auth_utils
from database import get_db

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.post("/upload")
def upload_plan(file: UploadFile = File(...), current_user: models.User = Depends(auth_utils.get_current_user)):
    # Validate file extension
    valid_extensions = [".dxf", ".ifc"]
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .dxf and .ifc permitted.")
    
    # Normally we would save it to a cloud bucket or local /uploads dir and trigger a parsing job
    # For now, we simulate success
    return {
        "filename": file.filename, 
        "message": "File successfully uploaded and queued for processing.",
        "size": file.size or "Unknown"
    }

@router.post("/dependency/", response_model=schemas.DependencyCreate)
def create_dependency(dep: schemas.DependencyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db_dep = models.Dependency(**dep.model_dump())
    db.add(db_dep)
    db.commit()
    return dep

@router.post("/simulate", response_model=List[schemas.TaskResponse])
def run_simulation(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_role(["Project Manager", "Construction Planner", "Civil Engineer"]))):
    tasks = db.query(models.Task).all()
    deps = db.query(models.Dependency).all()
    
    updated_tasks = cpm_engine.calculate_cpm(tasks, deps)
    
    # Save computed values
    for task in updated_tasks:
        db.merge(task)
    db.commit()
    
    return db.query(models.Task).all()

@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Task).all()
