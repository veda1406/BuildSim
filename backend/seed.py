from database import engine, SessionLocal, Base
import models
import cpm_engine

# Ensure tables are created
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_data():
    if db.query(models.Task).count() > 0:
        print("Data already exists. Clearing to reseed.")
        db.query(models.Dependency).delete()
        db.query(models.Task).delete()
        db.commit()

    t1 = models.Task(name="Excavation & Foundation", duration=7)
    t2 = models.Task(name="Structural Framing", duration=10)
    t3 = models.Task(name="Roofing & Exterior", duration=6)
    t4 = models.Task(name="Interior Finishing", duration=8)

    db.add_all([t1, t2, t3, t4])
    db.commit()
    db.refresh(t1)
    db.refresh(t2)
    db.refresh(t3)
    db.refresh(t4)

    deps = [
        models.Dependency(predecessor_id=t1.id, successor_id=t2.id),
        models.Dependency(predecessor_id=t2.id, successor_id=t3.id),
        models.Dependency(predecessor_id=t3.id, successor_id=t4.id),
    ]
    db.add_all(deps)
    db.commit()

    # Trigger CPM Calculation
    tasks = db.query(models.Task).all()
    all_deps = db.query(models.Dependency).all()
    updated_tasks = cpm_engine.calculate_cpm(tasks, all_deps)
    
    for task in updated_tasks:
        db.merge(task)
    db.commit()

    print("Seeded new 4-stage UI mock database and simulated CPM schedule.")

if __name__ == "__main__":
    seed_data()
