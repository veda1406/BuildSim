import { Layers, Sun, Moon, Box as BoxIcon, Scissors, Ruler, Camera, BarChart2, Eye, EyeOff, FastForward } from 'lucide-react';
import type { ArchitectState } from '../../../types';

interface ArchitectSidebarProps {
  architectState: ArchitectState;
  setArchitectState: React.Dispatch<React.SetStateAction<ArchitectState>>;
}

export default function ArchitectSidebar({ architectState, setArchitectState }: ArchitectSidebarProps) {
  const updateState = (updates: Partial<ArchitectState>) => {
    setArchitectState(prev => ({ ...prev, ...updates }));
  };

  return (
    <aside className="w-[23rem] z-20 border-l border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-6 shadow-2xl justify-start items-center">
       <div className="w-full flex justify-between items-center mb-2 border-b border-gray-800 pb-4">
         <h3 className="text-sm font-black text-white tracking-widest uppercase">Design Studio</h3>
         <Layers className="text-emerald-500 w-5 h-5" />
       </div>

       {/* Simulation Speed Control */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-2"><FastForward className="w-3 h-3" /> Simulation Speed</span>
         <div className="flex gap-2">
           {[0.5, 1, 2, 5].map((speed) => (
             <button
               key={speed} 
               onClick={() => updateState({ simulationSpeed: speed })}
               className={`flex-1 py-1 rounded text-xs font-bold transition-colors border ${architectState.simulationSpeed === speed ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
             >
               {speed}x
             </button>
           ))}
         </div>
       </div>

       {/* Advanced Viewport Layers */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block">Model Layers</span>
         <div className="flex flex-col gap-3">
           {Object.keys(architectState.layers || {}).map((layer) => {
             const config = architectState.layers[layer];
             const isIsolated = architectState.isolatedLayer === layer;
             return (
               <div key={layer} className="flex flex-col gap-1 bg-[#0b0c10]/50 p-2 border border-gray-800 rounded">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <button onClick={() => updateState({ 
                       layers: { ...architectState.layers, [layer]: { ...config, visible: !config.visible } } 
                     })}>
                       {config.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                     </button>
                     <span className="text-[0.65rem] uppercase font-bold text-gray-300">{layer}</span>
                   </div>
                   <button 
                     onClick={() => updateState({ isolatedLayer: isIsolated ? null : layer })}
                     className={`text-[0.6rem] px-2 py-0.5 rounded border ${isIsolated ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-[#1a1d24] border-gray-700 text-gray-500'}`}
                   >
                     {isIsolated ? 'ISOLATED' : 'ISOLATE'}
                   </button>
                 </div>
                 {config.visible && (
                   <input type="range" min="0" max="1" step="0.1" value={config.opacity} 
                     onChange={(e) => updateState({
                       layers: { ...architectState.layers, [layer]: { ...config, opacity: parseFloat(e.target.value) } }
                     })}
                     className="w-full h-1 accent-emerald-500 mt-1" 
                   />
                 )}
               </div>
             )
           })}
         </div>
       </div>

       {/* Architecture Materials */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-2"><BoxIcon className="w-3 h-3" /> Object Material Painter</span>
         
         {architectState.selectedElementId ? (
           <div className="flex flex-col gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
             <span className="text-[0.65rem] text-emerald-400">Selected ID: {architectState.selectedElementId.slice(0, 8)}...</span>
             <div className="grid grid-cols-2 gap-1 mt-1">
               {['default', 'concrete', 'glass', 'wood'].map((mat) => {
                 const isAssigned = architectState.elementMaterials[architectState.selectedElementId!] === mat;
                 return (
                   <button
                     key={mat}
                     onClick={() => updateState({ 
                       elementMaterials: { ...architectState.elementMaterials, [architectState.selectedElementId!]: mat } 
                     })}
                     className={`py-1 rounded text-[0.6rem] font-bold transition-colors border ${isAssigned ? 'bg-indigo-500/30 border-indigo-500/80 text-indigo-300' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
                   >
                     {mat.toUpperCase()}
                   </button>
                 );
               })}
             </div>
             <button onClick={() => updateState({ selectedElementId: null })} className="mt-2 text-[0.6rem] text-red-400 underline">Clear Selection</button>
           </div>
         ) : (
           <span className="text-[0.65rem] text-gray-500 italic">Click an element in the model to assign unique materials.</span>
         )}

         <span className="text-[0.6rem] text-gray-500 border-t border-gray-800 pt-3 block mt-2">Global Override</span>
         <div className="grid grid-cols-3 gap-2">
           {['default', 'wireframe', 'concrete'].map((mat) => (
             <button
               key={mat}
               onClick={() => updateState({ materialMode: mat as any })}
               className={`py-1.5 rounded text-[0.6rem] font-bold transition-colors border ${architectState.materialMode === mat ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
             >
               {mat.toUpperCase()}
             </button>
           ))}
         </div>
       </div>

       {/* Section Cut */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-2"><Scissors className="w-3 h-3" /> Section Cut</span>
         <div className="flex items-center justify-between">
           <span className="text-xs text-gray-400 font-bold">Enable Cut</span>
           <button 
             onClick={() => updateState({ sectionCutEnabled: !architectState.sectionCutEnabled })}
             className={`w-10 h-5 rounded-full relative transition-colors ${architectState.sectionCutEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
           >
             <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${architectState.sectionCutEnabled ? 'translate-x-5' : 'translate-x-1'}`}></span>
           </button>
         </div>
         {architectState.sectionCutEnabled && (
           <div className="flex flex-col gap-2">
             <span className="text-[0.6rem] text-gray-500 font-bold">Z-Axis Offset: {architectState.sectionCutZ.toFixed(1)}m</span>
             <input type="range" min="-10" max="10" step="0.5" value={architectState.sectionCutZ} onChange={(e) => updateState({ sectionCutZ: parseFloat(e.target.value) })} className="w-full accent-emerald-500" />
           </div>
         )}
       </div>

       {/* Measurement & interactions */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-2"><Ruler className="w-3 h-3" /> Spatial Tools</span>
         <button
           onClick={() => updateState({ measuringActive: !architectState.measuringActive, measureDistance: null })}
           className={`py-2 rounded text-xs font-bold transition-colors border ${architectState.measuringActive ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
         >
           {architectState.measuringActive ? 'MEASURING (CLICK 2 PTS)' : 'START MEASUREMENT'}
         </button>
         {architectState.measureDistance !== null && (
           <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded text-center">
             Distance: {architectState.measureDistance.toFixed(2)} m
           </div>
         )}
         {architectState.selectedZone && (
           <div className="mt-2 p-3 border border-emerald-500/30 bg-emerald-500/5 rounded">
             <span className="text-emerald-400 text-xs font-bold block mb-1">Zone Info</span>
             <span className="text-[0.65rem] text-gray-300 block">ID: {architectState.selectedZone}</span>
             {architectState.selectedZoneArea && <span className="text-[0.65rem] text-gray-300 block">Area: {architectState.selectedZoneArea.toFixed(1)} m²</span>}
           </div>
         )}
       </div>

       {/* Environmental / Time of Day */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block">Solar Study</span>
         <div className="flex flex-col gap-2">
           <span className="text-[0.6rem] text-gray-400 font-bold flex justify-between">
             <span>Time of Day</span>
             <span>{Math.floor(architectState.sunTime)}:00</span>
           </span>
           <input type="range" min="0" max="24" step="1" value={architectState.sunTime} onChange={(e) => updateState({ sunTime: parseFloat(e.target.value) })} className="w-full accent-emerald-500" />
         </div>
       </div>

       {/* Design Variant */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block">Design Variant</span>
         <div className="flex gap-2">
           {['A', 'B'].map(variant => (
             <button
               key={variant}
               onClick={() => updateState({ designVariant: variant as any })}
               className={`flex-1 py-2 rounded text-xs font-bold transition-colors border ${architectState.designVariant === variant ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
             >
               OPTION {variant}
             </button>
           ))}
         </div>
       </div>

       {/* Walkthrough Mode */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block">Presentation</span>
         <button
           onClick={() => updateState({ walkthroughMode: !architectState.walkthroughMode })}
           className={`py-2 flex justify-center items-center gap-2 rounded text-xs font-bold transition-colors border ${architectState.walkthroughMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-[#1a1d24] border-gray-700 text-gray-400'}`}
         >
           <Camera className="w-4 h-4" /> 
           {architectState.walkthroughMode ? 'EXIT WALKTHROUGH' : 'ENTER WALKTHROUGH'}
         </button>
         {architectState.walkthroughMode && <span className="text-[0.6rem] text-indigo-400 text-center">Use WASD to move, esc to unlock.</span>}
       </div>

       {/* Design Insights Box */}
       <div className="w-full bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-3">
         <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-2">
           <BarChart2 className="w-3 h-3" /> Realtime Design Insights
         </span>
         
         {architectState.designInsights && architectState.designInsights.length > 0 ? (
           architectState.designInsights.map((insight, idx) => (
             <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-2 rounded border-l-2 border-amber-500">
               <span className="text-[0.6rem] text-gray-300 leading-tight">{insight}</span>
             </div>
           ))
         ) : (
           <span className="text-[0.65rem] text-gray-500 italic">Analyzing structural parameters...</span>
         )}
       </div>
    </aside>
  );
}
