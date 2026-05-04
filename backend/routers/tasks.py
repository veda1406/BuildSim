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

import os
import parsers

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

@router.post("/upload")
def upload_plan(
    file: UploadFile = File(...), 
    num_stories: int = Form(4),
    project_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    # Validate file extension
    valid_extensions = [".dxf", ".ifc"]
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .dxf and .ifc permitted.")
    
    # Save file temporarily to parse it
    temp_filepath = f"temp_{file.filename}"
    with open(temp_filepath, "wb") as f:
        f.write(file.file.read())
        
    try:
        model_data = parsers.parse_file(temp_filepath, file.filename, num_stories=num_stories)
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
            
    # Always target Project 1 for the single-session model
    target_project_id = 1
    
    estimated_budget = model_data.get("estimated_budget", 0)
    total_days = model_data.get("total_days", 100)
    area = model_data.get("area", 0)
    
    db_project = db.query(models.Project).filter(models.Project.id == target_project_id).first()
    if db_project:
        db_project.estimated_budget = estimated_budget
        db_project.final_budget = estimated_budget 
        db_project.total_days = total_days
        db_project.area = area
        db_project.is_overridden = False
        db.commit()
        
    # Clear previous tasks for a fresh session
    db.query(models.Task).delete()
    db.commit()

    return {
        "filename": file.filename, 
        "message": "File successfully parsed and session reset.",
        "model_data": model_data,
        "project_id": target_project_id,
        "estimated_budget": estimated_budget,
        "total_days": total_days
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
