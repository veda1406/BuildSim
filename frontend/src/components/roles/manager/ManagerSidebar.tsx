import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Activity, AlertTriangle, DollarSign, CheckCircle, Zap } from 'lucide-react';
import type { ParsedModel } from '../../../types';

interface SimulationData {
  base_duration: number;
  total_delay: number;
  final_duration: number;
  current_stage: string;
  stages: { name: string; start: number; end: number }[];
}

interface ScenarioResult2 {
  built_area: number;
  base_duration_days: number;
  base_cost: number;
  base_workers: number;
  final_duration: number;
  final_cost: number;
  delta_duration: number;
  delta_cost: number;
}

interface ManagerSidebarProps {
  currentDay: number;
  numStories?: number;
  uploadedModel?: ParsedModel | null;
  onSimUpdate?: (simData: SimulationData | null, scenario: ScenarioResult2 | null) => void;
  activeProjectId?: number;
  triggerRefresh?: any;
}

interface Stage {
  name: string;
  start: number;
  end: number;
}

interface CostData {
  structure_cost: number;
  wall_cost: number;
  facade_cost: number;
  mep_cost: number;
  total_cost: number;
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

/** Estimate floor footprint bounding-box area (sqm) from model ground elements */
function estimateAreaFromModel(model: ParsedModel): number {
  const groundElements = model.elements.filter(e => e.position[1] < 4.0);
  if (groundElements.length === 0) return 1000;
  const xs = groundElements.flatMap(e => [e.position[0] - e.size[0] / 2, e.position[0] + e.size[0] / 2]);
  const zs = groundElements.flatMap(e => [e.position[2] - e.size[2] / 2, e.position[2] + e.size[2] / 2]);
  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
  return Math.max(Math.round(area), 50);
}

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDays = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)} days`;

export default function ManagerSidebar({ currentDay, numStories = 4, uploadedModel, onSimUpdate, activeProjectId, triggerRefresh }: ManagerSidebarProps) {
  const isModelLoaded = !!uploadedModel;

  // ── Area (auto or manual) ──────────────────────────────────────────────────
  const [area, setArea] = useState(1000);
  useEffect(() => {
    if (uploadedModel) setArea(estimateAreaFromModel(uploadedModel));
  }, [uploadedModel]);

  // ── Scenario knobs ─────────────────────────────────────────────────────────
  const [workers, setWorkers]           = useState(20);
  const [budgetMult, setBudgetMult]     = useState(1.0);
  const [weatherDelay, setWeatherDelay] = useState(0);
  const [materialDelay, setMaterialDelay] = useState(0);

  // ── API state ──────────────────────────────────────────────────────────────
  const [simData, setSimData]       = useState<SimulationData | null>(null);
  const [costData, setCostData]     = useState<CostData | null>(null);
  const [scenario, setScenario]     = useState<ScenarioResult | null>(null);

  // Sync workers slider max / default to base_workers from scenario
  const baseWorkers = scenario?.base_workers ?? 20;

  // ── Fetch Gantt timeline ───────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/simulate-timeline', {
          floors: numStories,
          area,
          weather_delay: Math.round(weatherDelay),
          material_delay: Math.round(materialDelay),
          labor_delay: 0,
          elapsed_day: currentDay,
        });
        setSimData(res.data);
        if (onSimUpdate) onSimUpdate(res.data, scenario);
      } catch (e) { console.error('timeline', e); }
    };
    run();
  }, [weatherDelay, materialDelay, currentDay, numStories, area]);

  // ── Fetch cost breakdown ───────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/calculate-cost', { floors: numStories, area });
        setCostData(res.data);
      } catch (e) { console.error('cost', e); }
    };
    run();
  }, [numStories, area]);

  // ── Fetch what-if scenario ─────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/project/simulate-scenario', {
          footprint_area: area,
          number_of_floors: numStories,
          workers,
          budget_multiplier: budgetMult,
          delay_weather_days: weatherDelay,
          delay_material_days: materialDelay,
        });
        setScenario(res.data);
        if (onSimUpdate) onSimUpdate(simData, res.data);
      } catch (e) { console.error('scenario', e); }
    };
    run();
  }, [area, numStories, workers, budgetMult, weatherDelay, materialDelay]);

  // Sync workers to base when model/area changes
  useEffect(() => {
    if (scenario) setWorkers(Math.round(scenario.base_workers));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.base_workers]);

  const totalDelay = (weatherDelay + materialDelay);

  return (
    <aside className="w-[24rem] z-20 border-l border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-6 shadow-2xl shrink-0">

      {/* ── Building Context ────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="flex-1 bg-[#161921] border border-gray-800 p-4 rounded-xl">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Built Area</span>
          <span className="text-white font-bold text-lg">{scenario?.built_area.toLocaleString() ?? '—'} <span className="text-sm text-gray-400">m²</span></span>
        </div>
        <div className="flex-1 bg-[#161921] border border-gray-800 p-4 rounded-xl">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Base Workers</span>
          <span className="text-white font-bold text-lg">{scenario?.base_workers.toFixed(0) ?? '—'} <span className="text-sm text-gray-400">crew</span></span>
        </div>
        <div className="flex-1 bg-[#161921] border border-gray-800 p-4 rounded-xl">
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Floors</span>
          <span className="text-white font-bold text-lg">{numStories} <span className="text-sm text-gray-400">flr</span></span>
        </div>
      </div>

      {/* ── Cost Breakdown ─────────────────────────────────────────────── */}
      <div className="bg-[#161921] border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
          <span className="text-xs text-emerald-500 tracking-widest flex items-center gap-2 uppercase font-black">
            <DollarSign className="w-4 h-4" /> Cost Breakdown
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] text-gray-400 font-bold uppercase">Area (sqm)</span>
            <div className="relative">
              <input
                type="number"
                value={area}
                onChange={e => !isModelLoaded && setArea(Math.max(50, Number(e.target.value) || 50))}
                readOnly={isModelLoaded}
                className={`w-20 bg-[#0b0c10] border rounded px-2 py-1 text-xs font-bold ${isModelLoaded ? 'border-emerald-500/50 text-emerald-400 cursor-not-allowed' : 'border-gray-700 text-white'}`}
              />
              {isModelLoaded && <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-emerald-500" />}
            </div>
          </div>
        </div>

        {isModelLoaded && (
          <div className="flex items-center gap-1.5 text-[0.6rem] text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-3 h-3 shrink-0" /> Synced from uploaded model — {numStories} floors × {area} m²
          </div>
        )}

        <div>
          <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Total Cost (breakdown)</span>
          <span className="text-white font-bold text-xl">{costData ? fmt(costData.total_cost) : '—'}</span>
        </div>

        {costData && costData.total_cost > 0 && (
          <div className="flex flex-col gap-3">
            <div className="w-full h-3 bg-[#0b0c10] rounded-full overflow-hidden flex border border-gray-800">
              {[
                { pct: costData.structure_cost / costData.total_cost, cls: 'bg-blue-500' },
                { pct: costData.wall_cost     / costData.total_cost, cls: 'bg-orange-500' },
                { pct: costData.facade_cost   / costData.total_cost, cls: 'bg-purple-500' },
                { pct: costData.mep_cost      / costData.total_cost, cls: 'bg-teal-500' },
              ].map(({ pct, cls }, i) => (
                <div key={i} style={{ width: `${pct * 100}%` }} className={`h-full ${cls} transition-all duration-500`} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                { label: 'Structure', cls: 'bg-blue-500',   val: costData.structure_cost },
                { label: 'Walls',     cls: 'bg-orange-500', val: costData.wall_cost },
                { label: 'Facade',    cls: 'bg-purple-500', val: costData.facade_cost },
                { label: 'MEP',       cls: 'bg-teal-500',   val: costData.mep_cost },
              ].map(({ label, cls, val }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-bold text-gray-400">
                    <div className={`w-2 h-2 rounded-sm ${cls}`} /> {label}
                  </span>
                  <span className="text-gray-200 font-semibold">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline (Gantt) ───────────────────────────────────────────── */}
      <div className="bg-[#161921] border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
          <span className="text-xs text-emerald-500 tracking-widest flex items-center gap-2 uppercase font-black">
            <Activity className="w-4 h-4" /> Timeline
          </span>
          <span className="text-white font-bold text-sm">{simData?.current_stage ?? 'N/A'}</span>
        </div>
        <div className="w-full h-8 bg-[#0b0c10] rounded-lg overflow-hidden flex relative border border-gray-800">
          {simData?.stages.map((stage, idx) => {
            const w = simData.final_duration > 0 ? ((stage.end - stage.start) / simData.final_duration) * 100 : 0;
            const active = currentDay >= stage.start && currentDay < stage.end;
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500'];
            return (
              <div key={stage.name} style={{ width: `${w}%` }}
                className={`h-full ${colors[idx % 5]} ${active ? 'opacity-100 shadow-[0_0_12px_rgba(255,255,255,0.25)] z-10' : 'opacity-30'} border-r border-gray-900/50 transition-all duration-300`}
                title={`${stage.name}: Day ${stage.start}–${stage.end}`} />
            );
          })}
          {simData && simData.final_duration > 0 && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_8px_white] transition-all duration-300"
              style={{ left: `${Math.min((currentDay / simData.final_duration) * 100, 100)}%` }} />
          )}
        </div>
        <div className="flex justify-between text-[0.6rem] text-gray-500 font-bold">
          <span>Day 0</span>
          <span>Day {simData?.final_duration ?? 0}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {simData?.stages.map((s, idx) => {
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500'];
            return (
              <span key={s.name} className="flex items-center gap-1 text-[0.6rem] font-bold text-gray-400">
                <div className={`w-2 h-2 rounded-sm ${colors[idx % 5]}`} />{s.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── What-If Scenario Simulation ─────────────────────────────────── */}
      <div className="bg-[#161921] border border-yellow-500/20 p-5 rounded-xl flex flex-col gap-5">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-800/50">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400 tracking-widest uppercase font-black">What-If Scenario</span>
        </div>

        {/* Scenario Result Cards */}
        {scenario && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b0c10] rounded-lg p-3 border border-gray-800">
              <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Final Duration</span>
              <span className="text-white font-bold text-lg">{scenario.final_duration.toFixed(1)}<span className="text-sm text-gray-400 ml-1">days</span></span>
              <span className={`text-[0.65rem] font-bold block mt-0.5 ${scenario.delta_duration <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtDays(scenario.delta_duration)} vs base
              </span>
            </div>
            <div className="bg-[#0b0c10] rounded-lg p-3 border border-gray-800">
              <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Final Cost</span>
              <span className="text-white font-bold text-base">{fmt(Math.round(scenario.final_cost))}</span>
              <span className={`text-[0.65rem] font-bold block mt-0.5 ${scenario.delta_cost <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {scenario.delta_cost >= 0 ? '+' : ''}{fmt(Math.round(scenario.delta_cost))} vs base
              </span>
            </div>
          </div>
        )}

        {/* Sliders */}
        <div className="flex flex-col gap-4">
          {/* Workers */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-300">
              <span>Workers <span className="text-gray-500 font-normal">(base: {baseWorkers.toFixed(0)})</span></span>
              <span className="text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded">{workers} crew</span>
            </div>
            <input type="range" min={Math.max(5, Math.round(baseWorkers * 0.3))} max={Math.round(baseWorkers * 3)} value={workers}
              onChange={e => setWorkers(Number(e.target.value))}
              className="w-full accent-yellow-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            <div className="flex justify-between text-[0.6rem] text-gray-600">
              <span>−70%</span><span>baseline</span><span>+200%</span>
            </div>
          </div>

          {/* Budget Multiplier */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-300">
              <span>Budget Multiplier</span>
              <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">{budgetMult.toFixed(2)}×</span>
            </div>
            <input type="range" min={50} max={200} value={Math.round(budgetMult * 100)}
              onChange={e => setBudgetMult(Number(e.target.value) / 100)}
              className="w-full accent-blue-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            <div className="flex justify-between text-[0.6rem] text-gray-600">
              <span>0.5×</span><span>1.0× base</span><span>2.0×</span>
            </div>
          </div>

          {/* Weather Delay */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-300">
              <span>Weather Delay</span>
              <span className="text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded">{weatherDelay} days</span>
            </div>
            <input type="range" min={0} max={60} value={weatherDelay}
              onChange={e => setWeatherDelay(Number(e.target.value))}
              className="w-full accent-orange-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>

          {/* Material Delay */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-300">
              <span>Material Supply Delay</span>
              <span className="text-red-300 bg-red-500/10 px-2 py-0.5 rounded">{materialDelay} days</span>
            </div>
            <input type="range" min={0} max={90} value={materialDelay}
              onChange={e => setMaterialDelay(Number(e.target.value))}
              className="w-full accent-red-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ── AI Recommendation ──────────────────────────────────────────── */}
      <div className="bg-[#0b0c10] border-2 border-emerald-500/30 p-5 rounded-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]" />
        <div className="flex items-center gap-2 mb-1 pl-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs text-white font-bold tracking-widest uppercase">AI Recommendation</h3>
        </div>
        <p className="pl-2 text-[0.7rem] text-gray-400 leading-relaxed font-medium">
          {scenario && scenario.delta_duration < -5
            ? `Increasing crew size to ${workers} is projected to save ${Math.abs(scenario.delta_duration).toFixed(0)} days. Ensure quality oversight scales proportionally.`
            : totalDelay > 0
              ? `Total external delay is ${totalDelay} days. Consider fast-tracking overlapping phases or pre-ordering materials to reduce exposure.`
              : `Project is on baseline track. Pre-purchasing facade materials 2–3 weeks early can prevent the most common late-stage bottleneck.`}
        </p>
      </div>
    </aside>
  );
}
