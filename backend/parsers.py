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

def parse_dxf_procedural(filepath, num_stories=4):
    """
    Parses a DXF file, extracts lines, and procedurally generates a multi-story building.
    """
    try:
        doc = ezdxf.readfile(filepath)
        msp = doc.modelspace()
    except Exception as e:
        print(f"Error reading DXF: {e}")
        return generate_demo_model()

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
        return generate_demo_model()
        
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

        # Add Walls
        for l in normalized_lines:
            # avoid tiny lines
            dist = math.hypot(l[2]-l[0], l[3]-l[1])
            if dist < 0.1: continue
            building_elements.append(calculate_wall(l[0], l[1], l[2], l[3], floor_height, base_y))
            
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

    return {"elements": building_elements}

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
            layer = "facade" if rtype == "exterior" else "walls"
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "wall", 
                "layer": layer,
                "position": pos, 
                "size": size, 
                "rotation": rot, 
                "color": color,
                "room_type": rtype
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
