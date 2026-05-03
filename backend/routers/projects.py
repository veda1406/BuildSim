from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth_utils
from database import get_db

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.patch("/{project_id}/budget", response_model=schemas.ProjectResponse)
def update_project_budget(project_id: int, budget_data: schemas.ProjectUpdateBudget, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if budget_data.final_budget <= 0:
        raise HTTPException(status_code=400, detail="Budget must be greater than zero.")
    if db_project.estimated_budget and budget_data.final_budget > db_project.estimated_budget * 1000:
        raise HTTPException(status_code=400, detail="Budget is unrealistically high compared to the estimate.")
        
    db_project.final_budget = budget_data.final_budget
    db_project.is_overridden = budget_data.is_overridden
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/", response_model=List[schemas.ProjectResponse])
def get_all_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()
