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
    doc.layers.new('WALLS', dxfattribs={'color': 7})
    doc.layers.new('STRUCTURE', dxfattribs={'color': 1}) # Red columns
    doc.layers.new('MEP', dxfattribs={'color': 5}) # Blue ducts

    # Exterior Footprint (15m x 10m)
    # Bottom Left [0,0]
    # CW
    msp.add_line((0, 0), (15, 0), dxfattribs={'layer': 'WALLS'})
    msp.add_line((15, 0), (15, 10), dxfattribs={'layer': 'WALLS'})
    msp.add_line((15, 10), (0, 10), dxfattribs={'layer': 'WALLS'})
    msp.add_line((0, 10), (0, 0), dxfattribs={'layer': 'WALLS'})

    # Interior Living Room Divide (at x=8)
    msp.add_line((8, 0), (8, 10), dxfattribs={'layer': 'WALLS'})
    
    # Kitchen & Bed Divide (at y=5)
    msp.add_line((8, 5), (15, 5), dxfattribs={'layer': 'WALLS'})

    # Structure Points (Intersections for columns)
    corners = [(0,0), (15,0), (15,10), (0,10), (8,0), (8,10), (8,5), (15,5)]
    for pt in corners:
        msp.add_point(pt, dxfattribs={'layer': 'STRUCTURE'})

    # MEP Duct (Central Corridor)
    msp.add_line((0.5, 4.5), (14.5, 4.5), dxfattribs={'layer': 'MEP'})

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
