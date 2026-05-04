import { useMemo } from 'react';

interface Stage {
  name: string;
  start: number;
  end: number;
}

interface SimulationData {
  base_duration: number;
  total_delay: number;
  final_duration: number;
  current_stage: string;
  stages: Stage[];
}

interface ScenarioResult {
  built_area: number;
  base_duration_days: number;
  base_cost: number;
  base_workers: number;
  final_duration: number;
  final_cost: number;
  delta_duration: number;
  delta_cost: number;
}

interface ProjectManagerCanvasProps {
  currentDay: number;
  simData: SimulationData | null;
  scenario: ScenarioResult | null;
}

const PHASE_COLORS = [
  { bg: 'bg-blue-500',    fill: '#3b82f6', text: 'text-blue-400',    border: 'border-blue-500',    glow: 'shadow-blue-500/70'    },
  { bg: 'bg-indigo-500',  fill: '#6366f1', text: 'text-indigo-400',  border: 'border-indigo-500',  glow: 'shadow-indigo-500/70'  },
  { bg: 'bg-purple-500',  fill: '#a855f7', text: 'text-purple-400',  border: 'border-purple-500',  glow: 'shadow-purple-500/70'  },
  { bg: 'bg-pink-500',    fill: '#ec4899', text: 'text-pink-400',    border: 'border-pink-500',    glow: 'shadow-pink-500/70'    },
  { bg: 'bg-emerald-500', fill: '#10b981', text: 'text-emerald-400', border: 'border-emerald-500', glow: 'shadow-emerald-500/70' },
];

export default function ProjectManagerCanvas({ currentDay, simData, scenario }: ProjectManagerCanvasProps) {
  const phases = useMemo(() => {
    if (!simData?.stages) return [];
    return simData.stages.map((stage, idx) => {
      let progress = 0;
      let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
      if (currentDay >= stage.end) {
        progress = 100;
        status = 'completed';
      } else if (currentDay >= stage.start) {
        progress = ((currentDay - stage.start) / Math.max(1, stage.end - stage.start)) * 100;
        status = 'active';
      }
      return {
        ...stage,
        progress,
        status,
        duration: stage.end - stage.start,
        remaining: Math.max(0, stage.end - currentDay),
        color: PHASE_COLORS[idx % PHASE_COLORS.length],
      };
    });
  }, [simData, currentDay]);

  const activePhase   = phases.find(p => p.status === 'active');
  const overallProgress = simData ? Math.min(100, (currentDay / Math.max(1, simData.final_duration)) * 100) : 0;
  const totalRemaining  = simData ? Math.max(0, simData.final_duration - currentDay) : 0;
  const timeScale = (scenario && scenario.base_duration_days > 0)
    ? scenario.final_duration / scenario.base_duration_days : 1;
  const isComplete = simData ? currentDay >= simData.final_duration : false;

  if (!simData) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="bg-[#121419]/90 backdrop-blur-sm rounded-2xl border border-gray-800 p-10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
            <span className="text-gray-600 text-xl">📋</span>
          </div>
          <p className="text-gray-500 text-sm font-semibold">Upload a building model to start simulation</p>
          <p className="text-gray-700 text-xs">Set workers, budget & delays in the panel →</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between py-6 px-8 pointer-events-none select-none">

      {/* ── Active Phase Badge (top-center) ─────────────────────────────── */}
      <div className="flex justify-center">
        {activePhase ? (
          <div className={`flex flex-col items-center gap-1.5`}>
            <div className={`flex items-center gap-2 px-5 py-2 rounded-full bg-[#0f1115]/90 backdrop-blur-md border ${activePhase.color.border}/60 shadow-lg shadow-black/50`}>
              <span className={`w-2 h-2 rounded-full ${activePhase.color.bg} animate-pulse shadow-md ${activePhase.color.glow}`} />
              <span className={`text-xs font-black tracking-widest uppercase ${activePhase.color.text}`}>
                {activePhase.name} Phase
              </span>
            </div>
            <span className="text-[0.6rem] text-gray-500 font-bold tracking-widest uppercase">
              {activePhase.remaining.toFixed(0)} days remaining in this phase
            </span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/50">
            <span className="text-emerald-400 font-black text-xs tracking-widest uppercase">✓ Project Complete</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#0f1115]/80 border border-gray-800">
            <span className="text-gray-500 font-bold text-xs tracking-widest uppercase">Awaiting Start</span>
          </div>
        )}
      </div>

      {/* ── Main Timeline Panel (bottom) ─────────────────────────────────── */}
      <div className="bg-[#0f1115]/95 backdrop-blur-md border border-gray-800/80 rounded-2xl px-7 py-5 shadow-2xl flex flex-col gap-5">

        {/* Header Row */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-white font-black tracking-widest uppercase text-sm">Project Timeline</h2>
            <p className="text-gray-500 text-[0.65rem] mt-0.5 font-semibold">
              Day <span className="text-white font-bold">{currentDay}</span>
              {' '}of <span className="text-white font-bold">{simData.final_duration}</span>
              {simData.total_delay > 0 && (
                <span className="text-red-400 ml-2 font-bold">+{simData.total_delay}d delay</span>
              )}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold mb-0.5">Complete</div>
              <div className="text-2xl font-black text-white leading-none">{overallProgress.toFixed(1)}<span className="text-base text-gray-400">%</span></div>
            </div>
            <div className="border-l border-gray-800 pl-6">
              <div className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold mb-0.5">Remaining</div>
              <div className="text-2xl font-black text-white leading-none">{totalRemaining.toFixed(0)}<span className="text-base text-gray-400 ml-1">days</span></div>
            </div>
            <div className="border-l border-gray-800 pl-6">
              <div className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold mb-0.5">Time Scale</div>
              <div className={`text-2xl font-black leading-none ${timeScale > 1.05 ? 'text-red-400' : timeScale < 0.95 ? 'text-emerald-400' : 'text-white'}`}>
                {timeScale.toFixed(2)}<span className="text-base text-gray-400">×</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Gantt Bar ────────────────────────────────────────────── */}
        <div>
          <div className="w-full h-12 bg-[#070809] rounded-xl overflow-hidden flex relative border border-gray-800/60 shadow-inner">
            {phases.map((phase) => {
              const widthPct = simData.final_duration > 0
                ? ((phase.end - phase.start) / simData.final_duration) * 100 : 0;
              return (
                <div key={phase.name} style={{ width: `${widthPct}%` }} className="relative h-full border-r border-gray-900/60">
                  {/* Dim background track */}
                  <div className={`absolute inset-0 ${phase.color.bg} opacity-[0.08]`} />
                  {/* Animated fill */}
                  <div
                    className={`absolute inset-y-0 left-0 ${phase.color.bg} transition-all duration-500 ease-out`}
                    style={{
                      width: `${phase.progress}%`,
                      opacity: phase.status === 'completed' ? 0.9 : phase.status === 'active' ? 0.75 : 0,
                    }}
                  />
                  {/* Active shimmer overlay */}
                  {phase.status === 'active' && (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.06) 100%)', width: `${phase.progress}%` }} />
                  )}
                  {/* Phase label */}
                  <div className={`absolute inset-0 flex items-center justify-center z-10`}>
                    <span className={`text-[0.55rem] font-black tracking-wider uppercase px-1 ${
                      phase.status === 'upcoming' ? 'text-gray-700' :
                      phase.status === 'completed' ? 'text-white/80' : 'text-white font-black'
                    }`}>
                      {phase.name}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Current Day Pointer */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white z-20 shadow-[0_0_12px_3px_rgba(255,255,255,0.55)] transition-all duration-300"
              style={{ left: `${Math.min(overallProgress, 99.5)}%` }}
            />
          </div>

          {/* Day Markers */}
          <div className="flex justify-between text-[0.58rem] text-gray-700 font-bold mt-1.5 px-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => (
              <span key={frac}>Day {Math.round(simData.final_duration * frac)}</span>
            ))}
          </div>
        </div>

        {/* ── Phase Progress Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          {phases.map((phase) => (
            <div
              key={phase.name}
              className={`rounded-xl p-3 border transition-all duration-400 ${
                phase.status === 'active'
                  ? `bg-[#181c24] ${phase.color.border}/50 shadow-lg`
                  : phase.status === 'completed'
                    ? 'bg-[#161921] border-gray-700/70'
                    : 'bg-[#0c0e12] border-gray-800/40 opacity-40'
              }`}
            >
              {/* Dot */}
              <div className={`w-2 h-2 rounded-full ${phase.color.bg} mb-2.5 ${
                phase.status === 'active' ? `animate-pulse shadow-[0_0_8px_2px] ${phase.color.glow}` : ''
              }`} />
              <div className={`text-[0.58rem] font-black tracking-widest uppercase mb-2 ${
                phase.status === 'upcoming' ? 'text-gray-700' : phase.color.text
              }`}>
                {phase.name}
              </div>
              {/* Mini bar */}
              <div className="w-full h-1 bg-gray-800/80 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${phase.color.bg} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
              <div className="flex justify-between items-end">
                <span className={`text-[0.7rem] font-black ${
                  phase.status === 'upcoming' ? 'text-gray-700' : 'text-gray-200'
                }`}>
                  {phase.progress.toFixed(0)}%
                </span>
                <span className="text-[0.55rem] text-gray-600 font-semibold">{phase.duration}d</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
