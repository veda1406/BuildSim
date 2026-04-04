
import { Sparkles } from 'lucide-react';

interface ManagerSidebarProps {
  currentDay: number;
}

export default function ManagerSidebar({ currentDay }: ManagerSidebarProps) {
  return (
    <aside className="w-[23rem] z-20 border-l border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-6 shadow-2xl">
      <div className="flex gap-4">
        <div className="flex-1 bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Current Cost</span>
          <span className="text-emerald-400 font-bold text-xl tracking-wider">₹{(currentDay * 84000).toLocaleString()}</span>
        </div>
        <div className="flex-1 bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Budget Left</span>
          <span className="text-white font-bold text-xl tracking-wider">₹{(5000000 - (currentDay * 84000)).toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg flex flex-col gap-6">
        <div className="flex justify-between items-center pb-2">
          <span className="text-xs text-emerald-500 tracking-widest flex items-center gap-2 uppercase font-black bg-emerald-500/10 px-3 py-1 rounded">
            AI Delay Prediction
          </span>
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
        </div>

        <div className="flex justify-center py-4">
            <div className="relative w-40 h-40 rounded-full border-8 border-[#1a1d24] flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.08)]">
              <svg className="absolute top-[-4px] left-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] transform -rotate-90 pointer-events-none">
                <circle cx="50%" cy="50%" r="46%" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="300" strokeDashoffset="264" strokeLinecap="round" className="drop-shadow-[0_0_10px_rgba(16,185,129,1)]"></circle>
              </svg>
              <div className="text-center">
                <span className="block text-3xl font-black text-white tracking-tighter">12%</span>
                <span className="block text-[0.6rem] text-emerald-500 tracking-widest uppercase font-bold mt-1">Risk Score</span>
              </div>
            </div>
        </div>

        <div className="flex flex-col gap-3 text-xs font-semibold tracking-wide">
          <div className="flex justify-between items-end pb-2">
            <span className="text-gray-400">Weather Risk</span>
            <span className="text-emerald-400 font-bold">LOW</span>
          </div>
          <div className="flex justify-between items-end pb-2">
            <span className="text-gray-400">Material Supply</span>
            <span className="text-yellow-400 font-bold">MODERATE</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-gray-400">Labor Availability</span>
            <span className="text-emerald-400 font-bold">STABLE</span>
          </div>
        </div>
      </div>

      <div className="bg-[#161921] border border-gray-800 p-5 rounded-xl shadow-lg">
        <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-4">Cost Burn-Rate Trend</span>
        <div className="w-full flex items-end gap-1 h-24 border-b border-gray-800/50 pb-1">
          {/* Simple CSS graph mock */}
          {[20, 30, 45, 60, 50, 75, 90, 100, 80, 50].map((h, i) => (
             <div key={i} className="flex-1 bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>

      <div className="bg-[#0b0c10] border-2 border-emerald-500/30 p-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.05)] flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"></div>
          <div className="flex items-center gap-2 mb-1 pl-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs text-white font-bold tracking-widest uppercase">AI Recommendation</h3>
          </div>
          <p className="pl-2 text-[0.7rem] text-gray-400 leading-relaxed font-medium">
            Current supply chain metrics suggest ordering interior finish materials <span className="text-gray-200">5 days early</span> to avoid potential logistics bottlenecks.
          </p>
      </div>
    </aside>
  );
}
