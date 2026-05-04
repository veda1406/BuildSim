import ezdxf
import math
import random
import os
import uuid
try:
    import ifcopenshell
    IFC_AVAILABLE = True
except ImportError:
    IFC_AVAILABLE = False

def calculate_wall(x1, y1, x2, y2, floor_height, floor_y_offset):
    # dx, dz (DXF Y axis becomes ThreeJS Z axis, ThreeJS Y is up)
    dx = x2 - x1
    dz = -(y2 - y1) # Invert Y to match Three.js coordinate system where -Z is forward
    dist = math.hypot(dx, dz)
    angle = math.atan2(dz, dx) # rotation around Y axis

    cx = (x1 + x2) / 2.0
    cz = -(y1 + y2) / 2.0
    cy = floor_y_offset + (floor_height / 2.0)

    # size = [length, height, width(thickness)]
    return {
        "id": str(uuid.uuid4()),
        "type": "wall",
        "layer": "walls",
        "position": [cx, cy, cz],
        "size": [dist, floor_height, 0.2],
        "rotation": [0, angle, 0],
        "color": "#a0aec0"
    }

def get_dxf_extents(lines):
    if not lines:
        return 0, 0, 0, 0
    min_x = min(min(L[0], L[2]) for L in lines)
    max_x = max(max(L[0], L[2]) for L in lines)
    min_y = min(min(L[1], L[3]) for L in lines)
    max_y = max(max(L[1], L[3]) for L in lines)
    return min_x, max_x, min_y, max_y

def detect_rooms(lines):
    x_coords = set()
    y_coords = set()
    h_lines = []
    v_lines = []
    tol = 0.1
    
    for l in lines:
        x1, y1, x2, y2 = l
        x1, y1, x2, y2 = round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)
        if abs(x1 - x2) < tol:
            avg_x = round((x1 + x2) / 2.0, 2)
            v_lines.append((avg_x, min(y1, y2), max(y1, y2)))
            x_coords.add(avg_x)
            y_coords.add(y1)
            y_coords.add(y2)
        elif abs(y1 - y2) < tol:
            avg_y = round((y1 + y2) / 2.0, 2)
            h_lines.append((avg_y, min(x1, x2), max(x1, x2)))
            y_coords.add(avg_y)
            x_coords.add(x1)
            x_coords.add(x2)

    x_list = sorted(list(x_coords))
    y_list = sorted(list(y_coords))
    
    if len(x_list) < 2 or len(y_list) < 2:
        return []
        
    n = len(x_list) - 1
    m = len(y_list) - 1
    
    def is_blocked_h(i, j):
        if i < 0 or i >= n: return False
        x_min, x_max = x_list[i], x_list[i+1]
        y = y_list[j+1]
        for hy, hx1, hx2 in h_lines:
            if abs(hy - y) < tol and hx1 - tol <= x_min and hx2 + tol >= x_max:
                return True
        return False

    def is_blocked_v(i, j):
        if j < 0 or j >= m: return False
        y_min, y_max = y_list[j], y_list[j+1]
        x = x_list[i+1]
        for vx, vy1, vy2 in v_lines:
            if abs(vx - x) < tol and vy1 - tol <= y_min and vy2 + tol >= y_max:
                return True
        return False

    visited = set()
    rooms = []
    
    for i in range(-1, n + 1):
        for j in range(-1, m + 1):
            if (i, j) not in visited:
                comp = []
                queue = [(i, j)]
                visited.add((i, j))
                is_outside = False
                
                while queue:
                    ci, cj = queue.pop(0)
                    if ci < 0 or ci >= n or cj < 0 or cj >= m:
                        is_outside = True
                    else:
                        comp.append((ci, cj))
                        
                    neighbors = []
                    if cj < m and not is_blocked_h(ci, cj): neighbors.append((ci, cj+1))
                    if cj > -1 and not is_blocked_h(ci, cj-1): neighbors.append((ci, cj-1))
                    if ci < n and not is_blocked_v(ci, cj): neighbors.append((ci+1, cj))
                    if ci > -1 and not is_blocked_v(ci-1, cj): neighbors.append((ci-1, cj))
                        
                    for ni, nj in neighbors:
                        if (ni, nj) not in visited:
                            visited.add((ni, nj))
                            queue.append((ni, nj))
                            
                if not is_outside and len(comp) > 0:
                    area = 0
                    min_x, min_y = float('inf'), float('inf')
                    max_x, max_y = float('-inf'), float('-inf')
                    for ci, cj in comp:
                        cx1, cx2 = x_list[ci], x_list[ci+1]
                        cy1, cy2 = y_list[cj], y_list[cj+1]
                        area += (cx2 - cx1) * (cy2 - cy1)
                        min_x = min(min_x, cx1)
                        min_y = min(min_y, cy1)
                        max_x = max(max_x, cx2)
                        max_y = max(max_y, cy2)
                        
                    if area > 2.0:
                        rooms.append({
                            "id": str(uuid.uuid4()),
                            "area": round(area, 2),
                            "points": [[min_x, min_y], [max_x, min_y], [max_x, max_y], [min_x, max_y]]
                        })
                    
    return rooms

def parse_dxf_procedural(filepath, num_stories=4):
    """
    Parses a DXF file, extracts lines, and procedurally generates a multi-story building.
    """
    try:
        doc = ezdxf.readfile(filepath)
        msp = doc.modelspace()
    except Exception as e:
        print(f"Error reading DXF: {e}")
        return generate_apartment_layout(num_stories)

    lines = []
    # simplistic line extraction
    for e in msp:
        if e.dxftype() == 'LINE':
            lines.append((e.dxf.start.x, e.dxf.start.y, e.dxf.end.x, e.dxf.end.y))
        elif e.dxftype() == 'LWPOLYLINE':
            points = e.get_points(format='xy')
            for i in range(len(points) - 1):
                lines.append((points[i][0], points[i][1], points[i+1][0], points[i+1][1]))
            if e.closed and len(points) > 0:
                lines.append((points[-1][0], points[-1][1], points[0][0], points[0][1]))

    if not lines:
        return generate_apartment_layout(num_stories)
        
    # Translate lines to origin
    min_x, max_x, min_y, max_y = get_dxf_extents(lines)
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    
    normalized_lines = []
    # If the scale is too large (millimeters), scale it down by 1000
    scale_factor = 1.0
    if (max_x - min_x) > 500:
        scale_factor = 1000.0

    for l in lines:
        x1 = (l[0] - cx) / scale_factor
        y1 = (l[1] - cy) / scale_factor
        x2 = (l[2] - cx) / scale_factor
        y2 = (l[3] - cy) / scale_factor
        normalized_lines.append((x1, y1, x2, y2))

    building_elements = []
    floor_height = 3.0
    
    n_min_x, n_max_x, n_min_y, n_max_y = get_dxf_extents(normalized_lines)
    slab_width = n_max_x - n_min_x + 1.0
    slab_depth = n_max_y - n_min_y + 1.0

    for story in range(num_stories):
        base_y = story * floor_height
        
        # Add Floor Slab
        building_elements.append({
            "id": str(uuid.uuid4()),
            "type": "slab",
            "layer": "floors",
            "position": [0, base_y - 0.1, 0],
            "size": [slab_width, 0.2, slab_depth],
            "rotation": [0, 0, 0],
            "color": "#cbd5e1"
        })

        # Add Walls and gather points for Columns
        points = set()
        for l in normalized_lines:
            # avoid tiny lines
            dist = math.hypot(l[2]-l[0], l[3]-l[1])
            if dist < 0.1: continue
            building_elements.append(calculate_wall(l[0], l[1], l[2], l[3], floor_height, base_y))
            points.add((round(l[0], 2), round(l[1], 2)))
            points.add((round(l[2], 2), round(l[3], 2)))
            
        # Add Columns at intersections
        for px, pz in points:
            building_elements.append({
                "id": str(uuid.uuid4()),
                "type": "column",
                "layer": "structure",
                "position": [px, base_y + floor_height / 2.0, -pz],
                "size": [0.3, floor_height, 0.3],
                "rotation": [0, 0, 0],
                "color": "#475569"
            })
            
        # Add a simple corridor MEP duct through the center
        building_elements.append({
            "id": str(uuid.uuid4()),
            "type": "duct",
            "layer": "mep",
            "position": [0, base_y + floor_height - 0.4, 0],
            "size": [slab_width * 0.8, 0.3, 0.3],
            "rotation": [0, 0, 0],
            "color": "#a1a1aa"
        })
            
        # Add a central core for aesthetics (Stairs/Elevator block placeholder)
        if story == 0:
            core_height = num_stories * floor_height
            building_elements.append({
                "id": str(uuid.uuid4()),
                "type": "core",
                "layer": "structure",
                "position": [0, core_height / 2.0 - 0.1, 0],
                "size": [3.0, core_height, 3.0],
                "rotation": [0, 0, 0],
                "color": "#64748b" # Dark slate
            })

        # Add Facade shell around the building (layered)
        # Slab is slab_width x slab_depth, centered at [0, base_y, 0]
        f_w = slab_width + 0.2
        f_d = slab_depth + 0.2
        f_w_win = slab_width + 0.4 # Window slightly offset outward
        f_d_win = slab_depth + 0.4
        
        f_span_b = [
            ([0, base_y + 0.4, -f_d/2], [f_w, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([0, base_y + 0.4, f_d/2], [f_w, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([-f_w/2, base_y + 0.4, 0], [f_d, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
            ([f_w/2, base_y + 0.4, 0], [f_d, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
        ]
        f_win = [
            ([0, base_y + 1.5, -f_d_win/2], [f_w_win, 1.4, 0.1], [0,0,0], "window", "#88ccff"),
            ([0, base_y + 1.5, f_d_win/2], [f_w_win, 1.4, 0.1], [0,0,0], "window", "#88ccff"),
            ([-f_w_win/2, base_y + 1.5, 0], [f_d_win, 1.4, 0.1], [0,math.pi/2,0], "window", "#88ccff"),
            ([f_w_win/2, base_y + 1.5, 0], [f_d_win, 1.4, 0.1], [0,math.pi/2,0], "window", "#88ccff"),
        ]
        f_span_t = [
            ([0, base_y + 2.6, -f_d/2], [f_w, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([0, base_y + 2.6, f_d/2], [f_w, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([-f_w/2, base_y + 2.6, 0], [f_d, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
            ([f_w/2, base_y + 2.6, 0], [f_d, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
        ]
        for pos, size, rot, ftype, color in f_span_b + f_win + f_span_t:
            building_elements.append({
                "id": str(uuid.uuid4()),
                "type": ftype,
                "layer": "facade",
                "position": pos,
                "size": size,
                "rotation": rot,
                "color": color
            })

    # Add roof slab
    building_elements.append({
        "id": str(uuid.uuid4()),
        "type": "slab",
        "layer": "floors",
        "position": [0, num_stories * floor_height - 0.1, 0],
        "size": [slab_width, 0.2, slab_depth],
        "rotation": [0, 0, 0],
        "color": "#cbd5e1"
    })

    rooms = detect_rooms(normalized_lines)

    # Calculate area and wall length
    area = (n_max_x - n_min_x) * (n_max_y - n_min_y)
    total_wall_length = 0
    for l in normalized_lines:
        total_wall_length += math.hypot(l[2]-l[0], l[3]-l[1])

    # Dynamic Simulation Duration
    # totalDays = baseDays + (areaFactor * area) + (floorFactor * floors)
    total_days = int(60 + (area * 0.1) + (num_stories * 5))
    total_days = max(30, min(365, total_days)) # Keep between 30 and 365 days

    # Budget Calculation: cost = area * rate + wall_length * factor
    # rate = 150, factor = 50 (sample values)
    estimated_budget = (area * 150 * num_stories) + (total_wall_length * 50 * num_stories)

    return {
        "elements": building_elements,
        "rooms": rooms,
        "area": round(area, 2),
        "wall_length": round(total_wall_length, 2),
        "estimated_budget": round(estimated_budget, 2),
        "total_days": total_days,
        "num_stories": num_stories
    }

def parse_ifc(filepath, num_stories=4):
    if not IFC_AVAILABLE:
        return generate_apartment_layout(num_stories)
    try:
        ifc_file = ifcopenshell.open(filepath)
        return generate_apartment_layout(num_stories)
    except Exception:
        return generate_apartment_layout(num_stories)

def generate_apartment_layout(num_stories=4):
    """Generates a highly detailed 2BHK/3BHK procedural layout with physical stairs and lifts."""
    elements = []
    floor_height = 3.0
    
    # Grid dimensions for a standard 3BHK footprint (approx 12x10)
    # We will generate rooms, lift shaft, and physical staircase steps
    
    for story in range(num_stories):
        base_y = story * floor_height
        
        # Floor Slab
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "slab",
            "layer": "floors",
            "position": [0, base_y - 0.1, 0],
            "size": [12.0, 0.2, 10.0],
            "rotation": [0, 0, 0],
            "color": "#e2e8f0",
            "room_type": "slab"
        })
        
        # Outer Walls
        w = [
            ([0, base_y + 1.5, -4.9], [12, 3, 0.2], [0,0,0], "#94a3b8", "exterior"),
            ([0, base_y + 1.5, 4.9], [12, 3, 0.2], [0,0,0], "#94a3b8", "exterior"),
            ([-5.9, base_y + 1.5, 0], [10, 3, 0.2], [0,math.pi/2,0], "#94a3b8", "exterior"),
            ([5.9, base_y + 1.5, 0], [10, 3, 0.2], [0,math.pi/2,0], "#94a3b8", "exterior"),
        ]
        
        # Internal Walls (Simulating Bedrooms, Living, Washrooms)
        # Main vertical corridor wall
        w.append(([-1.0, base_y + 1.5, 0], [10, 3, 0.2], [0,math.pi/2,0], "#cbd5e1", "corridor"))
        # Bedroom 1 & 2 dividing wall (Left side)
        w.append(([-3.5, base_y + 1.5, 0], [5, 3, 0.2], [0,0,0], "#cbd5e1", "bedroom"))
        # Washroom wall
        w.append(([2.0, base_y + 1.5, -2.5], [4, 3, 0.2], [0,math.pi/2,0], "#bfdbfe", "washroom"))
        w.append(([0.5, base_y + 1.5, -2.5], [3, 3, 0.2], [0,0,0], "#bfdbfe", "washroom"))
        
        for pos, size, rot, color, rtype in w:
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "wall", 
                "layer": "walls",
                "position": pos, 
                "size": size, 
                "rotation": rot, 
                "color": color,
                "room_type": rtype
            })

        # Facade Shell (layered with spandrels and window bands)
        # Bottom spandrel (Y = 0.4, H = 0.8) offset = 0.1 -> width 12.2 / 10.2
        f_span_b = [
            ([0, base_y + 0.4, -5.1], [12.2, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([0, base_y + 0.4, 5.1], [12.2, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([-6.1, base_y + 0.4, 0], [10.2, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
            ([6.1, base_y + 0.4, 0], [10.2, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
        ]
        # Window band (Y = 1.5, H = 1.4) slightly more offset = 0.2 -> width 12.4 / 10.4
        f_win = [
            ([0, base_y + 1.5, -5.2], [12.4, 1.4, 0.1], [0,0,0], "window", "#88ccff"),
            ([0, base_y + 1.5, 5.2], [12.4, 1.4, 0.1], [0,0,0], "window", "#88ccff"),
            ([-6.2, base_y + 1.5, 0], [10.4, 1.4, 0.1], [0,math.pi/2,0], "window", "#88ccff"),
            ([6.2, base_y + 1.5, 0], [10.4, 1.4, 0.1], [0,math.pi/2,0], "window", "#88ccff"),
        ]
        # Top spandrel (Y = 2.6, H = 0.8) offset = 0.1 -> width 12.2 / 10.2
        f_span_t = [
            ([0, base_y + 2.6, -5.1], [12.2, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([0, base_y + 2.6, 5.1], [12.2, 0.8, 0.1], [0,0,0], "spandrel", "#94a3b8"),
            ([-6.1, base_y + 2.6, 0], [10.2, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
            ([6.1, base_y + 2.6, 0], [10.2, 0.8, 0.1], [0,math.pi/2,0], "spandrel", "#94a3b8"),
        ]
        for pos, size, rot, ftype, color in f_span_b + f_win + f_span_t:
            elements.append({
                "id": str(uuid.uuid4()),
                "type": ftype, 
                "layer": "facade",
                "position": pos, 
                "size": size, 
                "rotation": rot, 
                "color": color,
                "room_type": "facade_panel"
            })

        # Columns
        corners = [
            [-5.9, -4.9], [5.9, -4.9], [-5.9, 4.9], [5.9, 4.9]
        ]
        for cx, cz in corners:
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "column",
                "layer": "structure",
                "position": [cx, base_y + 1.5, cz],
                "size": [0.4, 3.0, 0.4],
                "rotation": [0,0,0],
                "color": "#475569",
                "room_type": "column"
            })
            
        # Corridor MEP Duct
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "duct",
            "layer": "mep",
            "position": [-1.0, base_y + 2.6, 0],
            "size": [0.4, 0.4, 9.8],
            "rotation": [0,0,0],
            "color": "#94a3b8",
            "room_type": "mep_duct"
        })

        # Generate Lift Shaft and Cabin
        # Lift is located around x=2.0, z=2.0
        # Shaft
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "wall",
            "layer": "structure",
            "position": [2.0, base_y + 1.5, 2.0],
            "size": [2.2, 3, 2.2],
            "rotation": [0,0,0],
            "color": "#475569", 
            "room_type": "shaft"
        })
        # Cabin (only render roughly logic, glass box)
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "lift",
            "layer": "mep",
            "position": [2.0, base_y + 1.5, 2.0],
            "size": [1.8, 2.8, 1.8],
            "rotation": [0,0,0],
            "color": "#93c5fd",
            "room_type": "cabin"
        })
        
        # Generate Physical Stairs
        # Located at x=4.0, z=2.0, winding up
        steps_per_flight = 10
        step_height = (floor_height / 2.0) / steps_per_flight
        step_depth = 0.25
        step_width = 1.0
        
        # Flight 1 (Upwards along Z)
        for i in range(steps_per_flight):
            sy = base_y + (i * step_height) + (step_height/2)
            sz = 1.0 + (i * step_depth)
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "stair",
                "layer": "structure",
                "position": [3.5, sy, sz],
                "size": [step_width, step_height, step_depth],
                "rotation": [0,0,0],
                "color": "#64748b"
            })
            
        # Landing
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "slab",
            "layer": "structure",
            "position": [4.0, base_y + (floor_height/2) - 0.1, 3.5],
            "size": [2.0, 0.2, 1.5],
            "rotation": [0,0,0],
            "color": "#64748b"
        })
        
        # Flight 2 (Upwards along -Z)
        for i in range(steps_per_flight):
            sy = base_y + (floor_height/2) + (i * step_height) + (step_height/2)
            sz = 3.0 - (i * step_depth)
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "stair",
                "layer": "structure",
                "position": [4.5, sy, sz],
                "size": [step_width, step_height, step_depth],
                "rotation": [0,0,0],
                "color": "#64748b"
            })

    # Roof
    elements.append({
        "id": str(uuid.uuid4()),
        "type": "slab",
        "layer": "floors",
        "position": [0, num_stories * floor_height - 0.1, 0],
        "size": [12.0, 0.2, 10.0],
        "rotation": [0, 0, 0],
        "color": "#e2e8f0"
    })

    return {"elements": elements}

def parse_file(filepath: str, filename: str, num_stories: int = 4) -> dict:
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.dxf':
        return parse_dxf_procedural(filepath, num_stories)
    elif ext == '.ifc':
        return parse_ifc(filepath, num_stories)
    else:
        return generate_apartment_layout(num_stories)
