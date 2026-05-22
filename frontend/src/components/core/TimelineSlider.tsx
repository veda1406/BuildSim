

interface TimelineSliderProps {
  maxDay: number;
  currentDay: number;
  setCurrentDay: (day: number) => void;
}

export default function TimelineSlider({ maxDay, currentDay, setCurrentDay }: TimelineSliderProps) {
  return (
    <>
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="bg-[#121419]/90 border border-gray-800 p-3 rounded-lg backdrop-blur-md shadow-xl w-48">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Simulation Engine</span>
          <span className="text-white font-bold text-sm tracking-widest">ACTIVE VIEWPORT</span>
        </div>
        <div className="bg-[#121419]/90 border border-gray-800 p-3 rounded-lg backdrop-blur-md shadow-xl w-48">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Elapsed Time</span>
          <span className="text-white font-bold tracking-widest text-sm">DAY {currentDay} / {maxDay}</span>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 right-0 z-10 px-16 flex justify-center pointer-events-none">
          <input 
          type="range" min="0" max={maxDay} 
          value={currentDay} 
          onChange={(e) => setCurrentDay(parseInt(e.target.value))}
          className="w-full max-w-4xl cursor-pointer accent-emerald-500 pointer-events-auto h-1.5 bg-gray-800 rounded-lg appearance-none shadow-xl border border-gray-700"
        />
      </div>
    </>
  );
}
