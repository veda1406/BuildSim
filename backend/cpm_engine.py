from typing import List, Dict
from models import Task, Dependency

def calculate_cpm(tasks: List[Task], dependencies: List[Dependency]) -> List[Task]:
    """
    Calculates Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF)
    and Critical Path for a list of tasks and dependencies.
    """
    task_map = {task.id: task for task in tasks}
    
    # 1. Forward Pass (Calculate ES and EF)
    in_degree = {task.id: 0 for task in tasks}
    adj_out = {task.id: [] for task in tasks}
    
    for dep in dependencies:
        in_degree[dep.successor_id] += 1
        adj_out[dep.predecessor_id].append(dep)
        
    queue = [t_id for t_id, deg in in_degree.items() if deg == 0]
    
    while queue:
        curr_id = queue.pop(0)
        curr_task = task_map[curr_id]
        
        # EF = ES + Duration
        curr_task.early_finish = curr_task.early_start + curr_task.duration
        
        for dep in adj_out[curr_id]:
            succ_task = task_map[dep.successor_id]
            # Successor ES = Max of all Predecessors EF
            if succ_task.early_start < curr_task.early_finish:
                succ_task.early_start = curr_task.early_finish
                
            in_degree[dep.successor_id] -= 1
            if in_degree[dep.successor_id] == 0:
                queue.append(dep.successor_id)
                
    # 2. Backward Pass (Calculate LS and LF)
    max_ef = max([t.early_finish for t in tasks], default=0) if tasks else 0
    
    # Initialize all LFs to the project end date
    for task in tasks:
        task.late_finish = max_ef
        
    adj_in = {task.id: [] for task in tasks}
    out_degree = {task.id: 0 for task in tasks}
    
    for dep in dependencies:
        out_degree[dep.predecessor_id] += 1
        adj_in[dep.successor_id].append(dep)
        
    queue = [t_id for t_id, deg in out_degree.items() if deg == 0]
    
    while queue:
        curr_id = queue.pop(0)
        curr_task = task_map[curr_id]
        
        # LS = LF - Duration
        curr_task.late_start = curr_task.late_finish - curr_task.duration
        
        for dep in adj_in[curr_id]:
            pred_task = task_map[dep.predecessor_id]
            # Predecessor LF = Min of all Successors LS
            if pred_task.late_finish == max_ef or pred_task.late_finish > curr_task.late_start:
                pred_task.late_finish = curr_task.late_start
                
            out_degree[dep.predecessor_id] -= 1
            if out_degree[dep.predecessor_id] == 0:
                queue.append(dep.predecessor_id)
                
    # 3. Determine Critical Path
    for task in tasks:
        # If float is 0, it's on the critical path
        if task.early_start == task.late_start:
            task.is_critical = True
        else:
            task.is_critical = False
            
    return tasks
