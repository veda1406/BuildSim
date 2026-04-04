from pydantic import BaseModel
from typing import List, Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    name: str
    email: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    name: str
    duration: int

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int
    early_start: int
    early_finish: int
    late_start: int
    late_finish: int
    is_critical: bool
    
    class Config:
        from_attributes = True

class DependencyCreate(BaseModel):
    predecessor_id: int
    successor_id: int
    type: str = "FS"
    lag: int = 0
