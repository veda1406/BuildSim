import { CheckCircle, Clock, Circle } from 'lucide-react';

export default function TimelineStatus() {
  return (
    <div className="bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-3">
      <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-2">Phase Status</span>
      
      <div className="flex items-center gap-3 text-xs font-semibold">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-gray-300">Foundation</span>
        <span className="ml-auto text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Completed</span>
      </div>
      
      <div className="flex items-center gap-3 text-xs font-semibold">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-gray-300">Framing</span>
        <span className="ml-auto text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Delayed</span>
      </div>
      
      <div className="flex items-center gap-3 text-xs font-semibold">
        <Circle className="w-4 h-4 text-gray-600" />
        <span className="text-gray-500">Roofing</span>
        <span className="ml-auto text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Pending</span>
      </div>
    </div>
  );
}
