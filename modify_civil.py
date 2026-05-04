import re

with open("frontend/src/components/roles/civil/CivilSidebar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Imports
content = content.replace(
    "import { Activity, ShieldAlert, AlertTriangle, Cuboid, TrendingUp, Layers, CheckCircle2, Zap } from 'lucide-react';",
    "import { Activity, ShieldAlert, AlertTriangle, Cuboid, TrendingUp, Layers, CheckCircle2, Zap, Settings2, Flame, AlertCircle } from 'lucide-react';"
)

# 2. Update Component State and Analytics
analytics_start = "  const [activeTab, setActiveTab] = useState<'structural' | 'materials' | 'dependencies'>('structural');"
analytics_end = "  }, [model, numStories]);"

new_analytics = """  const [activeTab, setActiveTab] = useState<'structural' | 'materials' | 'dependencies'>('structural');
  const [showConstraints, setShowConstraints] = useState(false);

  const {
    soilType = 'Sand',
    windZone = 'Medium',
    seismicZone = 'Moderate',
    laborAvailability = 'Medium',
    materialSupply = 'Stable',
    optimizationMode = 'Safety',
    appliedSuggestions = [],
    heatmapActive = false
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
    const steelQty = concreteVol * 0.12;
    const brickCount = Math.floor(totalArea * 45 * (optimizationMode === 'Cost' ? 0.95 : 1.0));

    const deadLoadPerSqm = 5.0;
    const liveLoadPerSqm = 3.0;
    let totalLoadPerSqm = deadLoadPerSqm + liveLoadPerSqm;
    if (windZone === 'High') totalLoadPerSqm += 1.0;
    if (seismicZone === 'High') totalLoadPerSqm += 1.5;

    const totalLoad = totalArea * totalLoadPerSqm;
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

    if (soilType === 'Clay') safetyFactor -= 0.2;
    if (soilType === 'Rock') safetyFactor += 0.2;
    if (windZone === 'High') safetyFactor -= 0.1;
    if (seismicZone === 'High') safetyFactor -= 0.15;
    if (optimizationMode === 'Safety') safetyFactor += 0.2;
    if (optimizationMode === 'Cost') safetyFactor -= 0.1;

    if (appliedSuggestions.includes("Increase beam depth")) safetyFactor += 0.3;
    if (appliedSuggestions.includes("Implement shear walls or core structure")) safetyFactor += 0.5;
    if (appliedSuggestions.includes("Add intermediate columns")) safetyFactor += 0.2;
    if (appliedSuggestions.includes("Increase column cross-section")) safetyFactor += 0.2;

    if (maxSpan > 8 && !appliedSuggestions.includes("Add intermediate columns")) {
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
  }, [model, numStories, civilState]);

  import { useEffect } from 'react';
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
"""

content = content[:content.find(analytics_start)] + new_analytics + content[content.find(analytics_end)+len(analytics_end):]

# Move import useEffect
content = content.replace("import { useEffect } from 'react';", "")
content = content.replace("import { useState, useMemo }", "import { useState, useMemo, useEffect }")

# Update UI Part 1: Header (Failure Risk, Heatmap Toggle)
header_target = """          <div className="text-right">
            <div className="text-[0.6rem] text-gray-400 tracking-widest font-bold mb-1">SAFETY FACTOR</div>
            <div className="text-white font-black text-sm">{analytics.safetyFactor.toFixed(2)}</div>
          </div>
        </div>
      </div>"""

header_new = """          <div className="text-right">
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
      </div>"""

content = content.replace(header_target, header_new)

# Add Constraints Panel
constraints_ui = """            {/* Constraints Panel */}
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

            {/* Load Approximation */}"""

content = content.replace("{/* Load Approximation */}", constraints_ui)

# Update Suggestions to be interactive
suggestions_target = """                <div className="border-t border-red-500/20 pt-3">
                  <h5 className="text-[0.6rem] text-yellow-500 tracking-widest font-bold mb-2">SUGGESTED REINFORCEMENTS</h5>
                  <div className="flex flex-wrap gap-2">
                    {analytics.suggestions.map((s, i) => (
                      <span key={i} className="bg-[#1a1d24] border border-gray-700 text-gray-300 px-2 py-1 rounded text-[0.65rem] font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>"""

suggestions_new = """                <div className="border-t border-red-500/20 pt-3">
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
                </div>"""

content = content.replace(suggestions_target, suggestions_new)

# Update Currency (Cost) to INR
content = content.replace("~${(analytics.concreteVol * 120).toLocaleString(undefined, {maximumFractionDigits: 0})}", "~₹{(analytics.concreteVol * 120 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}")
content = content.replace("~${(analytics.steelQty * 800).toLocaleString(undefined, {maximumFractionDigits: 0})}", "~₹{(analytics.steelQty * 800 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}")
content = content.replace("~${(analytics.brickCount * 0.5).toLocaleString(undefined, {maximumFractionDigits: 0})}", "~₹{(analytics.brickCount * 0.5 * 83).toLocaleString('en-IN', {maximumFractionDigits: 0})}")

with open("frontend/src/components/roles/civil/CivilSidebar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
