import { useState, useEffect, useMemo } from 'react';
import ProjectHealthCard from './manager-ui/ProjectHealthCard';
import BudgetForecastCard from './manager-ui/BudgetForecastCard';
import RiskBreakdown from './manager-ui/RiskBreakdown';
import TimelineStatus from './manager-ui/TimelineStatus';
import DelayImpactSimulator from './manager-ui/DelayImpactSimulator';
import RecommendationPanel from './manager-ui/RecommendationPanel';
import AlertsPanel from './manager-ui/AlertsPanel';
import type { Task } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface ManagerSidebarProps {
  currentDay: number;
  activeProjectId: number;
  triggerRefresh?: any;
}

export default function ManagerSidebar({ currentDay, activeProjectId, triggerRefresh }: ManagerSidebarProps) {
  const { token } = useAuth();
  const [scenario, setScenario] = useState<'current' | 'optimized'>('current');
  
  // Project Context State
  const [project, setProject] = useState<any>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);


  // Fetch tasks to derive phase delays (requires auth token)
  useEffect(() => {
    if (!token) return;
    fetch('http://127.0.0.1:8000/tasks/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(err => console.error('Error fetching tasks for insights:', err));
  }, [triggerRefresh, token]);

  // Fetch specific project when activeProjectId changes
  useEffect(() => {
    setProject(null); // Set loading state while fetching new project
    fetch(`http://127.0.0.1:8000/projects/${activeProjectId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.detail) setProject(data);
      })
      .catch(err => console.error("Error fetching project data", err));
  }, [activeProjectId, triggerRefresh, refreshCounter]);

  // All derived values must be computed before any early return (Rules of Hooks)
  const mult = scenario === 'optimized' ? 0.8 : 1;
  const totalDays = project?.total_days || 100;
  const progressPercentage = Math.min(currentDay / totalDays, 1);
  const currentCost = progressPercentage * (project?.final_budget || 0) * mult;
  const riskPercent = Math.min((progressPercentage * 100) * 0.45 * mult, 100);
  const budgetUsedPercent = (project?.final_budget ?? 0) > 0 ? (currentCost / project.final_budget) * 100 : 0;
  const materialRisk = Math.round(45 * mult);
  const progressPercent = progressPercentage * 100;

  // Derive active critical-path tasks for insights
  const delayedTasks = useMemo(() => {
    return tasks
      .filter(t => t.early_start <= currentDay && t.early_finish > currentDay && t.is_critical)
      .map(t => t.name);
  }, [tasks, currentDay]);

  if (!project) {
    return (
      <aside className="w-[23rem] z-20 border-l border-gray-800 bg-[#121419] flex justify-center items-center p-6 shadow-2xl">
        <span className="text-gray-500 animate-pulse text-sm font-semibold tracking-widest uppercase">Loading Project Data...</span>
      </aside>
    );
  }

  return (
    <aside className="w-[23rem] z-20 border-l border-gray-800 bg-[#121419] flex flex-col p-6 overflow-y-auto gap-5 shadow-2xl custom-scrollbar">
      
      {/* Project Status */}
      <div className="flex flex-col gap-1 shrink-0 mb-1">
        <label className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold">Session Context</label>
        <div className="bg-[#1a1d24] border border-gray-800 text-emerald-400 text-xs rounded-lg p-2 font-black tracking-wider shadow-inner">
           ACTIVE CONSTRUCTION SESSION
        </div>
      </div>

      {/* Scenario Toggle */}
      <div className="flex bg-[#1a1d24] rounded-lg p-1 border border-gray-800 mb-2 shrink-0">
        <button 
          onClick={() => setScenario('current')}
          className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${scenario === 'current' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
        >
          Current Plan
        </button>
        <button 
          onClick={() => setScenario('optimized')}
          className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${scenario === 'optimized' ? 'bg-green-600/80 text-white shadow' : 'text-gray-400 hover:text-white'}`}
        >
          Optimized Plan
        </button>
      </div>

      <ProjectHealthCard riskPercent={riskPercent} budgetUsedPercent={budgetUsedPercent} />
      
      <BudgetForecastCard 
        currentCost={currentCost} 
        project={project} 
        onBudgetUpdated={() => setRefreshCounter(c => c + 1)}
      />
      
      <AlertsPanel />
      
      <RiskBreakdown />
      
      <DelayImpactSimulator baseCost={currentCost} />
      
      <TimelineStatus />
      
      <RecommendationPanel
        riskPercent={riskPercent}
        budgetUsedPercent={budgetUsedPercent}
        materialRisk={materialRisk}
        delayedTasks={delayedTasks}
        progressPercent={progressPercent}
        currentDay={currentDay}
      />
      
    </aside>
  );
}
