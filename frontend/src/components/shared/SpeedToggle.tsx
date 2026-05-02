import React from 'react';
import { useSimulation } from '../../context/SimulationContext';

const SpeedToggle: React.FC = () => {
  const { speedMultiplier, setSpeedMultiplier } = useSimulation();

  return (
    <div className="flex bg-[#121419] border border-gray-700 rounded overflow-hidden shadow-inner">
      {[0.5, 1, 2, 5].map((speed) => (
        <button
          key={speed}
          onClick={() => setSpeedMultiplier(speed)}
          className={`px-3 py-2 text-[0.6rem] font-black tracking-widest transition-all ${
            speedMultiplier === speed 
              ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          } ${speed !== 5 ? 'border-r border-gray-700' : ''}`}
          title={`Simulation Speed: ${speed}x`}
        >
          {speed}X
        </button>
      ))}
    </div>
  );
};

export default SpeedToggle;
