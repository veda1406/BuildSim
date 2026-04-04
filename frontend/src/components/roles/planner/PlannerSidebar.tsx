import { useState } from 'react';
import { Timer, Zap } from 'lucide-react';
import type { Task } from '../../../types';

interface PlannerSidebarProps {
  tasks: Task[];
  currentDay: number;
}

export default function PlannerSidebar({ tasks, currentDay }: PlannerSidebarProps) {
  const [delayInput, setDelayInput] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<number>(1);

  return (
    <aside className="w-[23rem] z-20 border-r border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-6 shadow-2xl">
      <div className="flex bg-[#1a1d24] p-1 rounded-lg border border-gray-800">
         <button className="flex-1 text-[0.65rem] tracking-wider font-bold py-2.5 bg-[#2a2d35] text-white rounded shadow-sm">MASTER GANTT</button>
      </div>

      <div className="flex flex-col gap-4">
        {tasks.map(t => {
            let status = "PENDING";
            let progress = 0;
            if (currentDay >= t.early_finish) {
               status = "COMPLETED";
               progress = 100;
            } else if (currentDay >= t.early_start) {
               status = "IN PROGRESS";
               progress = Math.round(((currentDay - t.early_start) / t.duration) * 100);
            }

            return (
              <div key={t.id} className="bg-[#161921] border border-gray-800 p-5 rounded-xl flex flex-col gap-4 transition-colors hover:border-gray-600 shadow-lg">
                <div className="flex justify-between items-start">
                  <span className="text-sm tracking-wide font-bold text-gray-100 flex items-center gap-2">
                    {t.is_critical && <Zap className="w-3 h-3 text-emerald-500" />}
                    {t.name}
                  </span>
                  <span className={`text-[0.6rem] px-2 py-1 rounded font-black tracking-widest ${status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status === 'IN PROGRESS' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-[#1a1d24] text-gray-500 border border-gray-800'}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 font-mono tracking-wider">
                  <span>Days {t.early_start} - {t.early_finish}</span>
                  <span className="text-[0.7rem]">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#1a1d24] rounded-full overflow-hidden border border-gray-800/50">
                  <div className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )
        })}
      </div>

      <div className="bg-[#0b0c10] border-2 border-emerald-500/30 p-5 rounded-xl shadow-lg flex flex-col gap-3 relative overflow-hidden mt-4">
        <div className="flex items-center gap-2 mb-2">
           <Timer className="w-4 h-4 text-emerald-500" />
           <h3 className="text-xs text-white font-bold tracking-widest uppercase">What-If Simulation</h3>
        </div>
        <p className="text-[0.65rem] text-gray-400 leading-relaxed mb-1">
          Simulate a task delay to see how dependencies cascade through the critical path.
        </p>
        <div className="flex flex-col gap-3">
          <select 
            value={selectedTask} onChange={(e) => setSelectedTask(parseInt(e.target.value))}
            className="w-full bg-[#1a1d24] border border-gray-700 rounded p-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          >
             {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500">+ Days:</span>
            <input 
              type="number" min="0" max="30" value={delayInput} onChange={(e) => setDelayInput(parseInt(e.target.value))}
              className="w-16 bg-[#1a1d24] border border-gray-700 rounded p-1.5 text-white text-center text-xs focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button className="w-full mt-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 py-2 rounded text-xs font-bold tracking-wider transition-colors shadow-sm">
            INJECT DELAY
          </button>
        </div>
      </div>
    </aside>
  );
}
