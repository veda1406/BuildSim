import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { Task, ParsedModel, ArchitectState, CivilState } from '../types';

interface SimulationContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentDay: number;
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>;
  maxDay: number;
  setMaxDay: React.Dispatch<React.SetStateAction<number>>;
  simulationStarted: boolean;
  setSimulationStarted: React.Dispatch<React.SetStateAction<boolean>>;
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;
  uploadedModel: ParsedModel | null;
  setUploadedModel: (model: ParsedModel | null) => void;
  numStories: number;
  setNumStories: (stories: number) => void;

  // Slider influence states
  weatherDelay: number;
  setWeatherDelay: (delay: number) => void;
  materialDelay: number;
  setMaterialDelay: (delay: number) => void;
  workers: number;
  setWorkers: (workers: number) => void;
  budgetMult: number;
  setBudgetMult: (mult: number) => void;

  // Centralized calculations & derivations
  area: number;
  setArea: (area: number) => void;
  pmSimData: any;
  setPmSimData: React.Dispatch<React.SetStateAction<any>>;
  pmScenario: any;
  setPmScenario: React.Dispatch<React.SetStateAction<any>>;
  costData: any;
  setCostData: React.Dispatch<React.SetStateAction<any>>;

  // Dashboard role perspectives
  architectState: ArchitectState;
  setArchitectState: React.Dispatch<React.SetStateAction<ArchitectState>>;
  civilState: CivilState;
  setCivilState: React.Dispatch<React.SetStateAction<CivilState>>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

function estimateAreaFromModel(model: ParsedModel): number {
  const groundElements = model.elements.filter(e => e.position[1] < 4.0);
  if (groundElements.length === 0) return 1000;
  const xs = groundElements.flatMap(e => [e.position[0] - e.size[0] / 2, e.position[0] + e.size[0] / 2]);
  const zs = groundElements.flatMap(e => [e.position[2] - e.size[2] / 2, e.position[2] + e.size[2] / 2]);
  const areaVal = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
  return Math.max(Math.round(areaVal), 50);
}

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Shared States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(() => getStorageItem('currentDay', 0));
  const [maxDay, setMaxDay] = useState<number>(() => getStorageItem('maxDay', 1));
  const [simulationStarted, setSimulationStarted] = useState<boolean>(() => getStorageItem('simulationStarted', false));
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(() => getStorageItem('speedMultiplier', 1));
  const [uploadedModel, setUploadedModel] = useState<ParsedModel | null>(() => getStorageItem('uploadedModel', null));
  const [numStories, setNumStories] = useState<number>(() => getStorageItem('numStories', 4));

  // Slider influence states
  const [weatherDelay, setWeatherDelay] = useState<number>(() => getStorageItem('weatherDelay', 0));
  const [materialDelay, setMaterialDelay] = useState<number>(() => getStorageItem('materialDelay', 0));
  const [workers, setWorkers] = useState<number>(() => getStorageItem('workers', 20));
  const [budgetMult, setBudgetMult] = useState<number>(() => getStorageItem('budgetMult', 1.0));
  const [area, setArea] = useState<number>(() => getStorageItem('area', 1000));

  // API Calculations & Derived states
  const [pmSimData, setPmSimData] = useState<any>(null);
  const [pmScenario, setPmScenario] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);

  // Role perspective defaults
  const initialArchitectState: ArchitectState = {
    materialMode: 'default',
    sectionCutEnabled: false,
    sectionCutZ: 0,
    measuringActive: false,
    measureDistance: null,
    sunTime: 12,
    layers: {
       'structure': { visible: true, opacity: 1 },
       'walls': { visible: true, opacity: 1 },
       'floors': { visible: true, opacity: 1 },
       'mep': { visible: true, opacity: 1 },
       'facade': { visible: true, opacity: 1 },
       'stairs': { visible: true, opacity: 1 }
    },
    isolatedLayer: null,
    selectedElementId: null,
    elementMaterials: {},
    designInsights: [],
    clashingElementIds: [],
    selectedZone: null,
    selectedZoneArea: null,
    designVariant: 'A',
    walkthroughMode: false,
    layerMode: 'all',
  };

  const initialCivilState: CivilState = {
    weakElementIds: [],
    selectedDependency: null,
    soilType: 'Sand',
    windZone: 'Medium',
    seismicZone: 'Moderate',
    laborAvailability: 'Medium',
    materialSupply: 'Stable',
    optimizationMode: 'Safety',
    appliedSuggestions: [],
    heatmapActive: false,
    stressLevels: {}
  };

  const [architectState, setArchitectState] = useState<ArchitectState>(() => getStorageItem('architectState', initialArchitectState));
  const [civilState, setCivilState] = useState<CivilState>(() => getStorageItem('civilState', initialCivilState));

  // Sync to localStorage
  useEffect(() => { setStorageItem('currentDay', currentDay); }, [currentDay]);
  useEffect(() => { setStorageItem('maxDay', maxDay); }, [maxDay]);
  useEffect(() => { setStorageItem('simulationStarted', simulationStarted); }, [simulationStarted]);
  useEffect(() => { setStorageItem('speedMultiplier', speedMultiplier); }, [speedMultiplier]);
  useEffect(() => { setStorageItem('uploadedModel', uploadedModel); }, [uploadedModel]);
  useEffect(() => { setStorageItem('numStories', numStories); }, [numStories]);
  useEffect(() => { setStorageItem('weatherDelay', weatherDelay); }, [weatherDelay]);
  useEffect(() => { setStorageItem('materialDelay', materialDelay); }, [materialDelay]);
  useEffect(() => { setStorageItem('workers', workers); }, [workers]);
  useEffect(() => { setStorageItem('budgetMult', budgetMult); }, [budgetMult]);
  useEffect(() => { setStorageItem('area', area); }, [area]);
  useEffect(() => { setStorageItem('architectState', architectState); }, [architectState]);
  useEffect(() => { setStorageItem('civilState', civilState); }, [civilState]);

  // Sync area automatically when uploadedModel updates
  useEffect(() => {
    if (uploadedModel) {
      setArea(estimateAreaFromModel(uploadedModel));
    }
  }, [uploadedModel]);

  // Sync simulation timeline loop
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/simulate-timeline', {
          floors: numStories,
          area,
          weather_delay: Math.round(weatherDelay),
          material_delay: Math.round(materialDelay),
          labor_delay: 0,
          elapsed_day: currentDay,
          simulation_speed: speedMultiplier,
          playback_state: simulationStarted ? "playing" : "paused",
          structural_material: civilState?.structuralMaterial || "Concrete",
          uploadedModel: uploadedModel,
        });
        setPmSimData(res.data);
      } catch (e) {
        console.error('Timeline API simulation error:', e);
      }
    };
    run();
  }, [weatherDelay, materialDelay, currentDay, numStories, area, speedMultiplier, simulationStarted, civilState?.structuralMaterial, uploadedModel]);

  // Sync cost breakdown calculations
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/calculate-cost', {
          floors: numStories,
          area
        });
        setCostData(res.data);
      } catch (e) {
        console.error('Cost calculation API error:', e);
      }
    };
    run();
  }, [numStories, area]);

  // Sync scenario simulation
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/simulate-scenario', {
          footprint_area: area,
          number_of_floors: numStories,
          workers,
          budget_multiplier: budgetMult,
          delay_weather_days: weatherDelay,
          delay_material_days: materialDelay,
        });
        setPmScenario(res.data);
      } catch (e) {
        console.error('Scenario simulation API error:', e);
      }
    };
    run();
  }, [area, numStories, workers, budgetMult, weatherDelay, materialDelay]);

  // Unified timeline duration sync (identical timeline length for all users/roles)
  useEffect(() => {
    if (pmSimData?.final_duration) {
      setMaxDay(pmSimData.final_duration);
    }
  }, [pmSimData?.final_duration]);

  // Central play/pause/reset timer progression loop
  useEffect(() => {
    let interval: any;
    if (simulationStarted) {
      const intervalDelay = 300 / speedMultiplier;
      interval = setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= maxDay) {
            setSimulationStarted(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalDelay);
    }
    return () => clearInterval(interval);
  }, [simulationStarted, maxDay, speedMultiplier]);

  // Workers sync helper
  useEffect(() => {
    if (pmScenario?.base_workers) {
      setWorkers((prev) => {
        const base = Math.round(pmScenario.base_workers);
        if (prev === 20 || prev < Math.max(5, base * 0.3) || prev > base * 3) {
          return base;
        }
        return prev;
      });
    }
  }, [pmScenario?.base_workers]);

  return (
    <SimulationContext.Provider
      value={{
        tasks,
        setTasks,
        currentDay,
        setCurrentDay,
        maxDay,
        setMaxDay,
        simulationStarted,
        setSimulationStarted,
        speedMultiplier,
        setSpeedMultiplier,
        uploadedModel,
        setUploadedModel,
        numStories,
        setNumStories,
        weatherDelay,
        setWeatherDelay,
        materialDelay,
        setMaterialDelay,
        workers,
        setWorkers,
        budgetMult,
        setBudgetMult,
        area,
        setArea,
        pmSimData,
        setPmSimData,
        pmScenario,
        setPmScenario,
        costData,
        setCostData,
        architectState,
        setArchitectState,
        civilState,
        setCivilState,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
