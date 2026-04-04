from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Project Manager")
    created_at = Column(Integer, default=0)


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    duration = Column(Integer, default=1) # duration in days
    
    # CPM Computed fields
    early_start = Column(Integer, default=0)
    early_finish = Column(Integer, default=0)
    late_start = Column(Integer, default=0)
    late_finish = Column(Integer, default=0)
    is_critical = Column(Boolean, default=False)
    
    # Relationships for CPM
    dependencies_out = relationship("Dependency", foreign_keys="[Dependency.predecessor_id]", back_populates="predecessor")
    dependencies_in = relationship("Dependency", foreign_keys="[Dependency.successor_id]", back_populates="successor")

class Dependency(Base):
    __tablename__ = "dependencies"
    
    id = Column(Integer, primary_key=True, index=True)
    predecessor_id = Column(Integer, ForeignKey("tasks.id"))
    successor_id = Column(Integer, ForeignKey("tasks.id"))
    type = Column(String, default="FS") # Finish-Start
    lag = Column(Integer, default=0)
    
    predecessor = relationship("Task", foreign_keys=[predecessor_id], back_populates="dependencies_out")
    successor = relationship("Task", foreign_keys=[successor_id], back_populates="dependencies_in")
