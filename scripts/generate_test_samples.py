import ezdxf
import uuid
import os

try:
    import ifcopenshell
    import ifcopenshell.api
    IFC_AVAILABLE = True
except ImportError:
    IFC_AVAILABLE = False

def generate_luxury_villa_dxf(output_path):
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    
    # Layers
    doc.layers.new('walls', dxfattribs={'color': 7})
    doc.layers.new('structure', dxfattribs={'color': 1}) # Red columns
    doc.layers.new('mep', dxfattribs={'color': 5}) # Blue ducts

    # Exterior Footprint (15m x 10m)
    # Bottom Left [0,0]
    # CW
    msp.add_line((0, 0), (15, 0), dxfattribs={'layer': 'walls'})
    msp.add_line((15, 0), (15, 10), dxfattribs={'layer': 'walls'})
    msp.add_line((15, 10), (0, 10), dxfattribs={'layer': 'walls'})
    msp.add_line((0, 10), (0, 0), dxfattribs={'layer': 'walls'})

    # Interior Living Room Divide (at x=8)
    msp.add_line((8, 0), (8, 10), dxfattribs={'layer': 'walls'})
    
    # Kitchen & Bed Divide (at y=5)
    msp.add_line((8, 5), (15, 5), dxfattribs={'layer': 'walls'})

    # Structure Points (Intersections for columns) -> Replaced with small 0.3x0.3 squares
    corners = [(0,0), (15,0), (15,10), (0,10), (8,0), (8,10), (8,5), (15,5)]
    s = 0.15 # half width
    for cx, cy in corners:
        msp.add_line((cx-s, cy-s), (cx+s, cy-s), dxfattribs={'layer': 'structure'})
        msp.add_line((cx+s, cy-s), (cx+s, cy+s), dxfattribs={'layer': 'structure'})
        msp.add_line((cx+s, cy+s), (cx-s, cy+s), dxfattribs={'layer': 'structure'})
        msp.add_line((cx-s, cy+s), (cx-s, cy-s), dxfattribs={'layer': 'structure'})

    # MEP Duct (Central Corridor) -> Replaced single line with two parallel lines offset by 0.2
    # Duct running from x=0.5 to x=14.5
    # Original y=4.5. We make y=4.4 and y=4.6
    msp.add_line((0.5, 4.4), (14.5, 4.4), dxfattribs={'layer': 'mep'})
    msp.add_line((0.5, 4.6), (14.5, 4.6), dxfattribs={'layer': 'mep'})
    # Cap the ends
    msp.add_line((0.5, 4.4), (0.5, 4.6), dxfattribs={'layer': 'mep'})
    msp.add_line((14.5, 4.4), (14.5, 4.6), dxfattribs={'layer': 'mep'})

    doc.saveas(output_path)
    print(f"DXF saved to {output_path}")

def generate_compact_apartment_ifc(output_path):
    if not IFC_AVAILABLE:
        print("Skipping IFC generation as ifcopenshell is not installed.")
        return

    try:
        # Create a basic IFC file with minimal schema entities
        model = ifcopenshell.file(schema="IFC4")
        
        # IFC standard boilerplate
        owner_history = model.create_entity("IfcOwnerHistory") # Stubs
        project = model.create_entity("IfcProject", GlobalId=str(uuid.uuid4()), Name="Sample Project")
        
        # Site -> Building -> Storey
        site = model.create_entity("IfcSite", GlobalId=str(uuid.uuid4()), Name="Sample Site")
        building = model.create_entity("IfcBuilding", GlobalId=str(uuid.uuid4()), Name="Sample Building")
        storey = model.create_entity("IfcBuildingStorey", GlobalId=str(uuid.uuid4()), Name="Ground Floor")
        
        # Simple Wall entity
        wall = model.create_entity("IfcWall", GlobalId=str(uuid.uuid4()), Name="Test Wall")
        
        print(f"IFC created with {len(model.by_type('IfcRoot'))} root entities.")
        model.write(output_path)
        print(f"IFC saved to {output_path}")
    except Exception as e:
        print(f"Failed to generate IFC: {e}")

if __name__ == "__main__":
    os.makedirs("backend/samples", exist_ok=True)
    generate_luxury_villa_dxf("backend/samples/luxury_villa.dxf")
    generate_compact_apartment_ifc("backend/samples/compact_apartment.ifc")
