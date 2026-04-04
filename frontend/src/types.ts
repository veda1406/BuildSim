export interface Task {
  id: number;
  name: string;
  duration: number;
  early_start: number;
  early_finish: number;
  is_critical: boolean;
}

export interface ArchitectState {
  materialMode: 'default' | 'concrete' | 'glass' | 'wood';
  sectionCutEnabled: boolean;
  sectionCutZ: number;
  measuringActive: boolean;
  measureDistance: number | null;
  sunTime: number;
  selectedZone: string | null;
  selectedZoneArea: number | null;
  designVariant: 'A' | 'B';
  walkthroughMode: boolean;
  layerMode: 'all' | 'structure' | 'mep' | 'shadow_study';
}

export interface ModelElement {
  id: string;
  type: string;
  position: [number, number, number];
  dimensions: [number, number, number];
  task_id: number;
}
