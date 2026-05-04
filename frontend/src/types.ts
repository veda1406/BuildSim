export interface Task {
  id: number;
  name: string;
  duration: number;
  early_start: number;
  early_finish: number;
  is_critical: boolean;
}

export interface LayerConfig {
  visible: boolean;
  opacity: number;
}

export interface ArchitectState {
  materialMode: 'default' | 'concrete' | 'glass' | 'wood' | 'wireframe';
  sectionCutEnabled: boolean;
  sectionCutZ: number;
  measuringActive: boolean;
  measureDistance: number | null;
  sunTime: number;
  
  // Advanced Simulation Controls
  simulationSpeed?: number;
  layers: Record<string, LayerConfig>;
  isolatedLayer: string | null;
  
  // Element Material overrides
  selectedElementId: string | null;
  elementMaterials: Record<string, string>;
  
  // Design Insights
  designInsights: string[];
  
  // UI Selection
  selectedZone: string | null;
  selectedZoneArea: number | null;
  designVariant: 'A' | 'B';
  walkthroughMode: boolean;
  layerMode: 'all' | 'structure' | 'mep' | 'shadow_study';
}

export interface ParsedModelElement {
  id: string;
  type: string;
  layer: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  color: string;
  room_type?: string;
}

export interface ParsedModel {
  elements: ParsedModelElement[];
}

export interface CivilState {
  weakElementIds: string[];
  selectedDependency: string | null;
  soilType?: 'Clay' | 'Sand' | 'Rock';
  windZone?: 'Low' | 'Medium' | 'High';
  seismicZone?: 'Low' | 'Moderate' | 'High';
  laborAvailability?: 'Low' | 'Medium' | 'High';
  materialSupply?: 'Stable' | 'Delayed';
  optimizationMode?: 'Cost' | 'Safety';
  appliedSuggestions?: string[];
  heatmapActive?: boolean;
  stressLevels?: Record<string, number>;
}
