import { useState, useMemo, useEffect } from 'react';
import { Activity, ShieldAlert, AlertTriangle, Cuboid, TrendingUp, Layers, Zap, Settings2, Flame, AlertCircle } from 'lucide-react';
import type { Task, ParsedModel, CivilState } from '../../../types';

interface CivilSidebarProps {
  tasks: Task[];
  model?: ParsedModel | null;
  numStories?: number;
  civilState?: CivilState;
  setCivilState?: React.Dispatch<React.SetStateAction<CivilState>>;
  currentDay?: number;
  maxDay?: number;
}

export default function CivilSidebar({ tasks: _tasks, model, numStories = 4, civilState, setCivilState, currentDay = 0, maxDay = 100 }: CivilSidebarProps) {
  const [activeTab, setActiveTab] = useState<'structural' | 'materials' | 'dependencies'>('structural');
  const [showConstraints, setShowConstraints] = useState(false);

  const {
    soilType = 'Sand',
    windZone = 'Medium',
    seismicZone = 'Moderate',
    laborAvailability = 'Medium',
    materialSupply = 'Stable',
    optimizationMode = 'Safety',
    appliedSuggestions = [],
    heatmapActive = false,
    structuralMaterial = 'Concrete'
  } = civilState || {};

  // Derived calculations based on model & parameters
  const analytics = useMemo(() => {
    let area = 150; // Default fallback area
    let maxSpan = 6.5;
    let weakElements: string[] = [];
    const stressLevels: Record<string, number> = {};

    if (model && model.elements.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      model.elements.forEach(el => {
        if (el.position[0] < minX) minX = el.position[0];
        if (el.position[0] > maxX) maxX = el.position[0];
        if (el.position[2] < minZ) minZ = el.position[2];
        if (el.position[2] > maxZ) maxZ = el.position[2];

        let stress = 0.2;
        if (el.type === 'beam' || el.type === 'slab') {
           const span = Math.max(el.size[0], el.size[2]);
           if (span > 8) {
             maxSpan = Math.max(maxSpan, span);
             weakElements.push(el.id!);
           }
           stress = Math.min(1.0, span / 10);
        } else if (el.type === 'column') {
           stress = 0.5;
        }
        stressLevels[el.id!] = stress;
      });
      
      const width = Math.max(10, maxX - minX);
      const depth = Math.max(10, maxZ - minZ);
      area = width * depth;
    }

    if (maxSpan < 8 && numStories > 10) {
      maxSpan = 8.5;
    }

    if (appliedSuggestions.includes("Add intermediate columns")) {
       maxSpan = Math.max(4, maxSpan - 3);
       weakElements = [];
     }

    const totalArea = area * numStories;
    const concreteVol = totalArea * 0.15 * (optimizationMode === 'Cost' ? 0.9 : 1.05);
    const steelQty = concreteVol * 0.12 * (structuralMaterial === 'Steel' ? 1.4 : 1.0);
    const brickCount = Math.floor(totalArea * 45 * (optimizationMode === 'Cost' ? 0.95 : 1.0));
    const timberVol = structuralMaterial === 'Wood' ? totalArea * 0.12 : 0;

    const deadLoadPerSqm = 5.0;
    const liveLoadPerSqm = 3.0;
    let totalLoadPerSqm = deadLoadPerSqm + liveLoadPerSqm;
    if (windZone === 'High') totalLoadPerSqm += 1.0;
    if (seismicZone === 'High') totalLoadPerSqm += 1.5;

    let totalLoad = totalArea * totalLoadPerSqm;

    // Material weight multipliers
    if (structuralMaterial === 'Concrete') {
      totalLoad *= 1.30; // Heavier load
    } else if (structuralMaterial === 'Wood') {
      totalLoad *= 0.60; // 40% lighter
    }

    const columnsCount = Math.max(4, Math.floor(area / 20));
    let loadPerColumn = totalLoad / columnsCount;

    if (appliedSuggestions.includes("Increase column cross-section")) {
       loadPerColumn *= 0.8;
    }

    if (model) {
       model.elements.forEach(el => {
         if (el.type === 'column') {
            stressLevels[el.id!] = Math.min(1.0, loadPerColumn / 4000);
            if (stressLevels[el.id!] > 0.8 && !weakElements.includes(el.id!)) {
               weakElements.push(el.id!);
            }
         }
       });
    }

    let feasibility: 'SAFE' | 'NEEDS REINFORCEMENT' | 'UNSAFE' = 'SAFE';
    let safetyFactor = 1.8;
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Soil and load constraints
    if (soilType === 'Clay') safetyFactor -= 0.2;
    if (soilType === 'Rock') safetyFactor += 0.2;
    if (windZone === 'High') safetyFactor -= 0.1;
    if (seismicZone === 'High') safetyFactor -= 0.15;
    if (optimizationMode === 'Safety') safetyFactor += 0.2;
    if (optimizationMode === 'Cost') safetyFactor -= 0.1;

    // Material safety factor offsets
    if (structuralMaterial === 'Concrete') {
      safetyFactor += 0.15;
    } else if (structuralMaterial === 'Steel') {
      safetyFactor += 0.30;
    } else if (structuralMaterial === 'Wood') {
      safetyFactor -= 0.20;
    }

    // Applied suggestions modifiers
    if (appliedSuggestions.includes("Increase beam depth")) safetyFactor += 0.3;
    if (appliedSuggestions.includes("Implement shear walls or core structure")) safetyFactor += 0.5;
    if (appliedSuggestions.includes("Add intermediate columns")) safetyFactor += 0.2;
    if (appliedSuggestions.includes("Increase column cross-section")) safetyFactor += 0.2;

    // Wood span limitations check
    if (structuralMaterial === 'Wood' && maxSpan > 6.0) {
      safetyFactor -= 0.35;
      violations.push(`Engineered wood span (${maxSpan.toFixed(1)}m) exceeds maximum safe limit of 6.0m`);
      suggestions.push("Add intermediate columns");
    }

    // Generic span limitations
    if (maxSpan > 8 && !appliedSuggestions.includes("Add intermediate columns") && structuralMaterial !== 'Wood') {
       feasibility = 'NEEDS REINFORCEMENT';
       safetyFactor -= 0.4;
       violations.push(`Excessive span detected: ${maxSpan.toFixed(1)}m`);
       suggestions.push("Add intermediate columns");
       if (!appliedSuggestions.includes("Increase beam depth")) suggestions.push("Increase beam depth");
    }
    
    if (loadPerColumn > 2500 && !appliedSuggestions.includes("Increase column cross-section")) {
       feasibility = 'NEEDS REINFORCEMENT';
       safetyFactor -= 0.3;
       violations.push(`High load per column: ${Math.round(loadPerColumn)} kN`);
       suggestions.push("Increase column cross-section");
    }

    if (numStories > 15 && !appliedSuggestions.includes("Implement shear walls or core structure")) {
       feasibility = 'UNSAFE';
       safetyFactor -= 0.6;
       violations.push(`Building height (${numStories} stories) exceeds base structural capacity`);
       suggestions.push("Implement shear walls or core structure");
    }

    if (safetyFactor < 1.0) feasibility = 'UNSAFE';
    else if (safetyFactor < 1.4) feasibility = 'NEEDS REINFORCEMENT';

    Object.keys(stressLevels).forEach(id => {
       stressLevels[id] = Math.min(1.0, stressLevels[id] * (1.8 / Math.max(0.1, safetyFactor)));
    });

    const failureRisk = Math.min(100, Math.max(1, (2.0 - safetyFactor) * 45));

    let foundation = "Isolated Footing";
    if (numStories > 5 || totalLoad > 10000) foundation = "Raft Foundation";
    if (numStories > 12 || loadPerColumn > 4000) foundation = "Pile Foundation";

    let difficulty: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (numStories > 5 || maxSpan > 7 || laborAvailability === 'Low' || materialSupply === 'Delayed') difficulty = 'MEDIUM';
    if (numStories > 12 || maxSpan > 10 || (laborAvailability === 'Low' && materialSupply === 'Delayed')) difficulty = 'HIGH';

    return {
      area,
      maxSpan,
      concreteVol,
      steelQty,
      brickCount,
      timberVol,
      totalLoad,
      loadPerColumn,
      feasibility,
      safetyFactor,
      violations,
      suggestions,
      foundation,
      difficulty,
      weakElements,
      failureRisk,
      stressLevels
    };
  }, [model, numStories, civilState, structuralMaterial]);

  useEffect(() => {
    if (setCivilState) {
      setCivilState(prev => {
        const prevKeys = Object.keys(prev.stressLevels || {});
        let changed = false;
        if (prevKeys.length !== Object.keys(analytics.stressLevels).length) changed = true;
        else {
          for (let k of prevKeys) {
            if (prev.stressLevels![k] !== analytics.stressLevels[k]) {
              changed = true;
              break;
            }
          }
        }
        if (changed) return { ...prev, stressLevels: analytics.stressLevels };
        return prev;
      });
    }
  }, [analytics.stressLevels, setCivilState]);

  // Real-time Construction Stage Validator Checklist
  const dependencyChecks = useMemo(() => {
    if (!model || model.elements.length === 0) return null;

    const maxFloor = Math.max(...model.elements.map(e => Math.floor((e.position[1] || 0) / 3.0)), 0);
    const totalFloors = maxFloor + 1;
    const superstructureStart = 0.10;
    const superstructureEnd = 0.85;
    const superstructureDuration = superstructureEnd - superstructureStart;
    const floorStep = superstructureDuration / totalFloors;

    let speedModifier = 1.0;
    if (structuralMaterial === 'Concrete') speedModifier = 1.35;
    else if (structuralMaterial === 'Steel') speedModifier = 0.70;
    else if (structuralMaterial === 'Wood') speedModifier = 0.85;

    const totalSimDays = maxDay * speedModifier;
    const globalProgress = Math.min(Math.max(currentDay / totalSimDays, 0), 1);

    let currentFloor = 0;
    let currentPhase: 'foundation' | 'columns' | 'frame' | 'slabs' | 'finishing' = 'foundation';
    let progressInFloor = 0;

    if (globalProgress < superstructureStart) {
      currentFloor = 0;
      currentPhase = 'foundation';
    } else if (globalProgress >= superstructureEnd) {
      currentFloor = maxFloor;
      currentPhase = 'finishing';
    } else {
      const activeProgress = globalProgress - superstructureStart;
      currentFloor = Math.min(maxFloor, Math.floor(activeProgress / floorStep));
      progressInFloor = (activeProgress % floorStep) / floorStep;
      if (progressInFloor < 0.35) {
        currentPhase = 'columns';
      } else if (progressInFloor < 0.75) {
        currentPhase = 'frame';
      } else {
        currentPhase = 'slabs';
      }
    }

    const checks = [];

    // Check 1: Slabs Blocked until Columns Complete
    const isSlabBlocked = (currentPhase === 'columns' || currentPhase === 'frame') || (currentFloor < maxFloor && globalProgress < superstructureEnd);
    checks.push({
      id: 'slab_column',
      name: `Level ${currentFloor} Slab Erection`,
      description: `Slab system blocked until support columns are fully erected.`,
      status: currentPhase === 'slabs' || (currentFloor < maxFloor && globalProgress > (superstructureStart + currentFloor * floorStep + floorStep * 0.75))
        ? 'COMPLETED' 
        : isSlabBlocked 
        ? 'BLOCKED' 
        : 'PENDING',
      message: currentPhase === 'slabs' 
        ? `Column support checks passed. Slab assembly active.` 
        : isSlabBlocked 
        ? `Columns at Level ${currentFloor} in progress (${Math.round((progressInFloor / 0.35) * 100)}%). Slab locked.` 
        : `Awaiting structural queue.`
    });

    // Check 2: Frame Blocked until Columns & Supports Exist
    const isFrameBlocked = currentPhase === 'columns';
    checks.push({
      id: 'frame_support',
      name: `Level ${currentFloor} Frame Assembly`,
      description: `Secondary frame blocked until primary load-bearing columns are secure.`,
      status: currentPhase === 'frame' || currentPhase === 'slabs' || (currentFloor < maxFloor && globalProgress > (superstructureStart + currentFloor * floorStep + floorStep * 0.35))
        ? 'COMPLETED' 
        : isFrameBlocked 
        ? 'BLOCKED' 
        : 'PENDING',
      message: currentPhase === 'frame' || currentPhase === 'slabs'
        ? `Primary supports verified. Frame installation active.` 
        : isFrameBlocked 
        ? `Awaiting completion of vertical columns at Level ${currentFloor}.` 
        : `Awaiting structural queue.`
    });

    // Check 3: Continuous Gravity Support Load Checks
    let supportWarning = null;
    if (structuralMaterial === 'Wood' && analytics.maxSpan > 6.0) {
      supportWarning = `Engineered wood span (${analytics.maxSpan.toFixed(1)}m) exceeds maximum allowable 6.0m limit. Reinforcement columns required!`;
    }

    checks.push({
      id: 'gravity_path',
      name: 'Continuous Load Path Integrity',
      description: 'Checks that load-bearing columns align continuously down to foundation.',
      status: supportWarning ? 'WARNING' : 'COMPLETED',
      message: supportWarning || 'Continuous gravity load path verified. Structural columns transfer load down to foundation.'
    });

    return {
      currentFloor,
      currentPhase,
      progressInFloor,
      checks
    };
  }, [model, currentDay, maxDay, structuralMaterial, analytics.maxSpan]);

  const applySuggestion = (suggestion: string) => {
    if (setCivilState && !appliedSuggestions.includes(suggestion)) {
       setCivilState(prev => ({
         ...prev,
         appliedSuggestions: [...(prev.appliedSuggestions || []), suggestion]
       }));
    }
  };

  const toggleHeatmap = () => {
    if (setCivilState) {
       setCivilState(prev => ({
         ...prev,
         heatmapActive: !prev.heatmapActive
       }));
    }
  };

  const toggleCriticalHighlight = () => {
    if (!setCivilState) return;
    setCivilState(prev => ({
      ...prev,
      weakElementIds: prev.weakElementIds.length > 0 ? [] : analytics.weakElements
    }));
  };

  const isHighlightActive = civilState?.weakElementIds && civilState.weakElementIds.length > 0;

  return (
    <aside className="w-[24rem] z-20 border-l border-gray-800 bg-[#0b0c10] flex flex-col h-full shadow-2xl">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-gray-800 bg-[#0f1115]">
        <h2 className="text-white font-black tracking-widest text-sm flex items-center gap-2">
          <Cuboid className="w-4 h-4 text-emerald-500" /> CIVIL ENGINEERING
        </h2>
        
        {/* Feasibility Status */}
        <div className={`mt-4 p-3 rounded-lg border flex items-center justify-between
          ${analytics.feasibility === 'SAFE' ? 'bg-emerald-500/10 border-emerald-500/30' : 
            analytics.feasibility === 'NEEDS REINFORCEMENT' ? 'bg-yellow-500/10 border-yellow-500/30' : 
            'bg-red-500/10 border-red-500/30'}`}
        >
          <div>
            <div className="text-[0.6rem] text-gray-400 tracking-widest font-bold mb-1">FEASIBILITY STATUS</div>
            <div className={`font-black text-xs tracking-wider
              ${analytics.feasibility === 'SAFE' ? 'text-emerald-400' : 
                analytics.feasibility === 'NEEDS REINFORCEMENT' ? 'text-yellow-400' : 
                'text-red-400'}`}
            >
              {analytics.feasibility}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[0.6rem] text-gray-400 tracking-widest font-bold mb-1">SAFETY FACTOR</div>
            <div className="text-white font-black text-sm">{analytics.safetyFactor.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <div className="flex-1 bg-[#121419] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
            <span className="text-[0.6rem] text-gray-400 tracking-widest font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" /> FAILURE RISK
            </span>
            <span className={`text-xs font-black ${analytics.failureRisk > 50 ? 'text-red-500' : analytics.failureRisk > 20 ? 'text-yellow-500' : 'text-emerald-500'}`}>
              {analytics.failureRisk.toFixed(1)}%
            </span>
          </div>
          <button 
            onClick={toggleHeatmap}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 text-[0.6rem] font-bold tracking-widest transition-all
              ${heatmapActive 
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                : 'bg-[#121419] text-gray-400 border-gray-800 hover:border-gray-600'}`}
          >
            <Flame className="w-3 h-3" /> HEATMAP {heatmapActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Load Transfer Flow Anim Button */}
        <div className="mt-2 flex gap-3">
          <button
            onClick={() => setCivilState?.(p => ({ ...p, loadTransferActive: !p.loadTransferActive }))}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 text-[0.6rem] font-bold tracking-widest transition-all
              ${civilState?.loadTransferActive
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'bg-[#121419] text-gray-400 border-gray-800 hover:border-gray-600'}`}
          >
            <Activity className="w-3 h-3 text-blue-400 animate-pulse" /> LOAD PATH FLOW {civilState?.loadTransferActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0f1115] border-b border-gray-800">
        {(['structural', 'materials', 'dependencies'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-[0.65rem] tracking-wider font-bold py-3 transition-colors ${
              activeTab === tab 
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-[#161921]' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 gap-6 flex flex-col">
        
        {activeTab === 'structural' && (
          <>
            {/* Constraints Panel */}
            <div className="bg-[#121419] border border-gray-800 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowConstraints(!showConstraints)}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d24] transition-colors"
              >
                <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold flex items-center gap-2">
                  <Settings2 className="w-3 h-3 text-purple-500" /> REAL-WORLD CONSTRAINTS
                </h4>
                <span className="text-xs text-gray-500">{showConstraints ? '−' : '+'}</span>
              </button>
              
              {showConstraints && (
                <div className="p-4 border-t border-gray-800 flex flex-col gap-3 bg-[#0f1115]">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6rem] text-gray-400 font-bold">SOIL TYPE</span>
                    <select 
                      value={soilType} 
                      onChange={(e) => setCivilState?.(p => ({ ...p, soilType: e.target.value as any }))}
                      className="bg-[#1a1d24] border border-gray-700 text-xs text-gray-300 p-1 rounded"
                    >
                      <option value="Clay">Clay (Weak)</option>
                      <option value="Sand">Sand (Moderate)</option>
                      <option value="Rock">Rock (Strong)</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6rem] text-gray-400 font-bold">WIND ZONE</span>
                    <select 
                      value={windZone} 
                      onChange={(e) => setCivilState?.(p => ({ ...p, windZone: e.target.value as any }))}
                      className="bg-[#1a1d24] border border-gray-700 text-xs text-gray-300 p-1 rounded"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6rem] text-gray-400 font-bold">SEISMIC ZONE</span>
                    <select 
                      value={seismicZone} 
                      onChange={(e) => setCivilState?.(p => ({ ...p, seismicZone: e.target.value as any }))}
                      className="bg-[#1a1d24] border border-gray-700 text-xs text-gray-300 p-1 rounded"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6rem] text-gray-400 font-bold">OPTIMIZATION</span>
                    <select 
                      value={optimizationMode} 
                      onChange={(e) => setCivilState?.(p => ({ ...p, optimizationMode: e.target.value as any }))}
                      className="bg-[#1a1d24] border border-gray-700 text-xs text-gray-300 p-1 rounded"
                    >
                      <option value="Cost">Cost</option>
                      <option value="Safety">Safety</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Load Approximation */}
            <div className="bg-[#121419] border border-gray-800 p-4 rounded-xl">
              <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-blue-500" /> LOAD APPROXIMATION
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[0.6rem] text-gray-500 font-bold mb-1">TOTAL LOAD</div>
                  <div className="text-white font-black text-sm">{Math.round(analytics.totalLoad).toLocaleString()} <span className="text-[0.65rem] text-gray-500">kN</span></div>
                </div>
                <div>
                  <div className="text-[0.6rem] text-gray-500 font-bold mb-1">PER COLUMN (AVG)</div>
                  <div className="text-white font-black text-sm">{Math.round(analytics.loadPerColumn).toLocaleString()} <span className="text-[0.65rem] text-gray-500">kN</span></div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="text-[0.6rem] text-gray-500 font-bold mb-1">RECOMMENDED FOUNDATION</div>
                <div className="text-blue-400 font-bold text-xs">{analytics.foundation.toUpperCase()}</div>
              </div>
            </div>

            {/* Constraints & Violations */}
            {analytics.violations.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                <h4 className="text-[0.65rem] text-red-500 tracking-widest font-bold mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" /> STRUCTURAL RISKS
                </h4>
                <ul className="flex flex-col gap-2 mb-4">
                  {analytics.violations.map((v, i) => (
                    <li key={i} className="text-gray-300 text-[0.7rem] flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span> {v}
                    </li>
                  ))}
                </ul>
                
                <div className="border-t border-red-500/20 pt-3">
                  <h5 className="text-[0.6rem] text-yellow-500 tracking-widest font-bold mb-2">SUGGESTED REINFORCEMENTS</h5>
                  <div className="flex flex-col gap-2">
                    {analytics.suggestions.map((s, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#1a1d24] border border-gray-700 px-3 py-2 rounded">
                        <span className="text-gray-300 text-[0.65rem] font-bold">{s}</span>
                        <button 
                          onClick={() => applySuggestion(s)}
                          className="text-[0.6rem] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-2 py-1 rounded font-bold transition-colors"
                        >
                          APPLY
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Critical Element Highlighting Button */}
            {analytics.weakElements.length > 0 && (
              <button 
                onClick={toggleCriticalHighlight}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold tracking-wider transition-all
                  ${isHighlightActive 
                    ? 'bg-red-500 text-black border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                    : 'bg-transparent text-red-400 border-red-500/50 hover:bg-red-500/10'}`}
              >
                <Zap className="w-4 h-4" /> {isHighlightActive ? 'HIDE CRITICAL ELEMENTS' : 'HIGHLIGHT CRITICAL ELEMENTS'}
              </button>
            )}

            {/* Difficulty Index */}
            <div className="flex justify-between items-center bg-[#121419] border border-gray-800 p-4 rounded-xl">
               <span className="text-[0.65rem] text-gray-500 tracking-widest font-bold">DIFFICULTY INDEX</span>
               <span className={`text-[0.65rem] font-black px-2 py-0.5 rounded
                 ${analytics.difficulty === 'LOW' ? 'bg-emerald-500 text-black' : 
                   analytics.difficulty === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-black'}`}
               >
                 {analytics.difficulty}
               </span>
            </div>
          </>
        )}

        {activeTab === 'materials' && (
          <div className="flex flex-col gap-4">
            {/* Primary Material Selector */}
            <div className="bg-[#121419] border border-gray-800 p-4 rounded-xl">
              <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold mb-3 flex items-center gap-2">
                <Settings2 className="w-3 h-3 text-emerald-500" /> STRUCTURAL MATERIAL
              </h4>
              <p className="text-[0.65rem] text-gray-400 mb-3 leading-relaxed">
                Select the primary load-bearing structural material. This dynamically impacts load weights, erection duration, and baseline safety limits.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['Concrete', 'Steel', 'Wood'] as const).map(mat => {
                  const isSelected = structuralMaterial === mat;
                  return (
                    <button
                      key={mat}
                      onClick={() => setCivilState?.(p => ({ ...p, structuralMaterial: mat }))}
                      className={`py-2 px-1 rounded-lg border text-center transition-all ${
                        isSelected
                          ? mat === 'Concrete'
                            ? 'bg-gray-500/20 text-gray-200 border-gray-400 shadow-[0_0_10px_rgba(156,163,175,0.2)]'
                            : mat === 'Steel'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-[#1a1d24] border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                      }`}
                    >
                      <div className="text-[0.7rem] font-black">{mat.toUpperCase()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Material Behavior Details */}
              <div className="mt-3 p-3 rounded bg-[#0f1115] border border-gray-800/50">
                {structuralMaterial === 'Concrete' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] text-gray-400 font-bold">BEHAVIOR CHARACTERISTICS</span>
                    <span className="text-gray-300 text-[0.65rem] leading-relaxed">
                      • <strong className="text-gray-100">Massive Load:</strong> Adds +30% structural weight.<br />
                      • <strong className="text-gray-100">Slower Build:</strong> Requires 28-day curing cycle, slowing visibility propagation in-scene.<br />
                      • <strong className="text-gray-100">Standard Cost:</strong> Balanced baseline materials pricing.
                    </span>
                  </div>
                )}
                {structuralMaterial === 'Steel' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] text-blue-400 font-bold">BEHAVIOR CHARACTERISTICS</span>
                    <span className="text-gray-300 text-[0.65rem] leading-relaxed">
                      • <strong className="text-gray-100">High Strength:</strong> Increases safety margin (SF +0.30).<br />
                      • <strong className="text-gray-100">Rapid Erection:</strong> Prefabricated columns/beams speed up simulated timelines (-30% build time).<br />
                      • <strong className="text-gray-100">Premium Cost:</strong> Steel materials reflect a +40% premium increase.
                    </span>
                  </div>
                )}
                {structuralMaterial === 'Wood' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] text-amber-500 font-bold">BEHAVIOR CHARACTERISTICS</span>
                    <span className="text-gray-300 text-[0.65rem] leading-relaxed">
                      • <strong className="text-gray-100">Lightweight:</strong> Decreases total structural dead load by -40%.<br />
                      • <strong className="text-gray-100">Moderate Build:</strong> Sustainability focus with moderate erection time (-15% build time).<br />
                      • <strong className="text-gray-100">Span Limitations:</strong> Strict max-span threshold of 6m. Exceeding 6m triggers warnings.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#121419] border border-gray-800 p-4 rounded-xl">
              <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold mb-4 flex items-center gap-2">
                <Layers className="w-3 h-3 text-purple-500" /> QUANTITY ESTIMATION
              </h4>
              
              <div className="flex flex-col gap-4">
                {structuralMaterial === 'Wood' ? (
                  <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                    <div>
                      <div className="text-[0.6rem] text-amber-500 font-bold mb-1">ENGINEERED TIMBER</div>
                      <div className="text-white font-black text-sm">{analytics.timberVol.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-[0.65rem] text-gray-500">m³</span></div>
                    </div>
                    <div className="text-[0.6rem] text-emerald-500 font-bold">~₹{(analytics.timberVol * 150 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                  </div>
                ) : (
                  <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                    <div>
                      <div className="text-[0.6rem] text-gray-500 font-bold mb-1">CONCRETE</div>
                      <div className="text-white font-black text-sm">{analytics.concreteVol.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-[0.65rem] text-gray-500">m³</span></div>
                    </div>
                    <div className="text-[0.6rem] text-emerald-500 font-bold">~₹{(analytics.concreteVol * 120 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                  </div>
                )}

                <div className="flex justify-between items-end border-b border-gray-800 pb-3">
                  <div>
                    <div className="text-[0.6rem] text-gray-500 font-bold mb-1">STRUCTURAL STEEL</div>
                    <div className="text-white font-black text-sm">{analytics.steelQty.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-[0.65rem] text-gray-500">tons</span></div>
                  </div>
                  <div className="text-[0.6rem] text-emerald-500 font-bold">~₹{(analytics.steelQty * 800 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[0.6rem] text-gray-500 font-bold mb-1">BRICKS / BLOCKS</div>
                    <div className="text-white font-black text-sm">{analytics.brickCount.toLocaleString()} <span className="text-[0.65rem] text-gray-500">pcs</span></div>
                  </div>
                  <div className="text-[0.6rem] text-emerald-500 font-bold">~₹{(analytics.brickCount * 0.5 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="flex flex-col gap-4">
            {/* Real-time Construction Stage Validator Checklist */}
            {dependencyChecks && (
              <div className="bg-[#121419] border border-gray-800 p-4 rounded-xl">
                <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3 text-yellow-500" /> CONSTRUCTION STAGE VALIDATOR
                </h4>
                <p className="text-[0.65rem] text-gray-400 mb-4 leading-relaxed">
                  Real-time support checks and safety validation of the active construction sequence.
                </p>

                <div className="flex flex-col gap-3">
                  {dependencyChecks.checks.map(chk => (
                    <div key={chk.id} className="p-3 rounded-lg border border-gray-800 bg-[#0f1115] flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.7rem] text-white font-extrabold">{chk.name}</span>
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded tracking-widest ${
                          chk.status === 'COMPLETED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : chk.status === 'BLOCKED' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : chk.status === 'WARNING'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {chk.status}
                        </span>
                      </div>
                      <p className="text-[0.6rem] text-gray-400">{chk.description}</p>
                      <div className="text-[0.62rem] text-gray-300 bg-[#161921] p-2 rounded border border-gray-800/50 flex items-center gap-2">
                        <span className={chk.status === 'COMPLETED' ? 'text-emerald-500' : chk.status === 'BLOCKED' ? 'text-red-400' : 'text-yellow-400'}>
                          {chk.status === 'COMPLETED' ? '✓' : chk.status === 'BLOCKED' ? '⏳' : '⚠'}
                        </span>
                        <span>{chk.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#121419] border border-gray-800 p-4 rounded-xl flex flex-col">
              <h4 className="text-[0.65rem] text-gray-500 tracking-widest font-bold mb-4 flex items-center gap-2">
                <Activity className="w-3 h-3 text-orange-500" /> LOAD PATH DEPENDENCY
              </h4>
              <p className="text-[0.65rem] text-gray-400 mb-4 leading-relaxed">
                Select an element level to simulate failure impact propagation.
              </p>

              <div className="flex flex-col gap-2 relative">
                {/* Dependency Tree UI */}
                {[
                  { id: 'slab', name: 'Slab System', affects: ['Beams'] },
                  { id: 'beam', name: 'Primary & Secondary Beams', affects: ['Columns', 'Slabs'] },
                  { id: 'column', name: 'Load Bearing Columns', affects: ['Foundation', 'Beams', 'Slabs'] },
                  { id: 'foundation', name: 'Foundation System', affects: ['Entire Structure'] }
                ].map((level, idx, arr) => {
                  const isSelected = civilState?.selectedDependency === level.id;
                  
                  return (
                    <div key={level.id} className="relative z-10">
                      <button 
                        onClick={() => setCivilState?.(prev => ({ ...prev, selectedDependency: prev.selectedDependency === level.id ? null : level.id }))}
                        className={`w-full text-left p-3 rounded-lg border text-xs font-bold transition-all flex justify-between items-center
                          ${isSelected 
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-md' 
                            : 'bg-[#1a1d24] border-gray-800 text-gray-300 hover:border-gray-600'}`}
                      >
                        <span>{level.name}</span>
                        {isSelected && <AlertTriangle className="w-4 h-4" />}
                      </button>
                      
                      {/* Failure propagation visualization */}
                      {isSelected && (
                        <div className="mt-2 mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                          <div className="text-[0.6rem] text-red-400 tracking-widest font-bold mb-1">FAILURE IMPACT:</div>
                          <div className="text-[0.7rem] text-gray-300">Affects {level.affects.join(', ')} directly. {idx > 0 && "Load redistribution required."}</div>
                        </div>
                      )}
                      
                      {idx < arr.length - 1 && (
                        <div className="w-0.5 h-4 bg-gray-800 ml-4 my-1 relative">
                           {isSelected && <div className="absolute inset-0 bg-orange-500 animate-pulse"></div>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

