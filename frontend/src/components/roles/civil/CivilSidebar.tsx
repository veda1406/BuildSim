import { useState } from 'react';
import { Activity, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { Task } from '../../../types';

interface CivilSidebarProps {
  tasks: Task[];
}

export default function CivilSidebar({ tasks }: CivilSidebarProps) {
  const [activeTab, setActiveTab] = useState<'critical' | 'structural'>('critical');

  return (
    <aside className="w-[23rem] z-20 border-l border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-6 shadow-2xl">
      <div className="flex gap-2 bg-[#1a1d24] p-1 rounded-lg border border-gray-800">
        <button 
          onClick={() => setActiveTab('critical')}
          className={`flex-1 text-[0.65rem] tracking-wider font-bold py-2.5 rounded transition-all ${activeTab === 'critical' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          DEPENDENCIES
        </button>
        <button 
          onClick={() => setActiveTab('structural')}
          className={`flex-1 text-[0.65rem] tracking-wider font-bold py-2.5 rounded transition-all ${activeTab === 'structural' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          STRUCTURAL RISKS
        </button>
      </div>

      {activeTab === 'critical' ? (
        <div className="flex flex-col gap-4">
          <div className="bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg">
            <h4 className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold mb-3 flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500" /> Critical Path Analysis</h4>
            <div className="flex flex-col gap-2">
              {tasks.filter(t => t.is_critical).map((t, idx) => (
                <div key={t.id} className="p-3 border border-emerald-500/30 bg-emerald-500/5 rounded-lg flex flex-col">
                  <span className="text-white text-xs font-bold">{idx + 1}. {t.name}</span>
                  <span className="text-[0.65rem] text-gray-500 mt-1">Duration: {t.duration}d | Start: Day {t.early_start}</span>
                </div>
              ))}
              {tasks.filter(t => !t.is_critical).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-2">
                   <h5 className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold">Float Tasks</h5>
                   {tasks.filter(t => !t.is_critical).map(t => (
                     <div key={t.id} className="p-2 flex justify-between items-center text-xs">
                        <span className="text-gray-400">{t.name}</span>
                        <span className="text-gray-600 bg-[#1a1d24] px-2 py-1 rounded text-[0.6rem] font-bold">FLOAT: {t.early_finish - t.duration}d</span>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl shadow-lg flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
               <span className="text-red-400 font-bold text-xs tracking-wider flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4" /> SHEAR LOAD WARNING
               </span>
               <span className="text-[0.6rem] bg-red-500 text-black font-black px-2 py-0.5 rounded">HIGH</span>
            </div>
            <p className="text-gray-400 text-[0.65rem] leading-relaxed">Zone B foundations currently under-supported for predicted wind loads. Recommended reinforcement before Day 15.</p>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl shadow-lg flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
               <span className="text-yellow-400 font-bold text-xs tracking-wider flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" /> CONCRETE CURING
               </span>
               <span className="text-[0.6rem] bg-yellow-500 text-black font-black px-2 py-0.5 rounded">MED</span>
            </div>
            <p className="text-gray-400 text-[0.65rem] leading-relaxed">Temperature drop expected. Structural framing (Task 2) might need a 2-day buffer for safe curing.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
