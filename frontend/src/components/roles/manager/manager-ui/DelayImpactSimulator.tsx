import { useState } from 'react';
import { Sliders } from 'lucide-react';

export default function DelayImpactSimulator({ baseCost }: { baseCost: number }) {
  const [delayDays, setDelayDays] = useState(0);
  
  const additionalCost = delayDays * 45000; 
  
  return (
    <div className="bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block">Delay Simulator</span>
        <Sliders className="w-3 h-3 text-gray-500" />
      </div>
      
      <div>
        <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
          <span>+0 days</span>
          <span className="text-white font-bold">{delayDays > 0 ? `+${delayDays} days` : 'No delay'}</span>
          <span>+30 days</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="30" 
          value={delayDays}
          onChange={(e) => setDelayDays(Number(e.target.value))}
          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>
      
      {delayDays > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs flex justify-between items-center mt-2">
           <div>
             <span className="block text-gray-400">Est. Cost Increase</span>
             <span className="font-bold text-red-500">+ ₹{additionalCost.toLocaleString()}</span>
           </div>
           <div className="text-right">
             <span className="block text-gray-400">Total Simulation</span>
             <span className="font-bold text-white">₹{(baseCost + additionalCost).toLocaleString()}</span>
           </div>
        </div>
      )}
    </div>
  );
}
