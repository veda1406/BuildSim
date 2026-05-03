import { useState, useMemo, type ComponentType } from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Users, DollarSign, RefreshCw, ChevronDown } from 'lucide-react';

interface Insight {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  icon: ComponentType<{ className?: string }>;
  title: string;
  action: string;
}

interface RecommendationPanelProps {
  riskPercent: number;
  budgetUsedPercent: number;
  materialRisk: number;
  delayedTasks: string[];
  currentDay: number;
  progressPercent: number;
}

function generateInsights({
  riskPercent,
  budgetUsedPercent,
  materialRisk,
  progressPercent
}: RecommendationPanelProps): Insight[] {
  const insights: Insight[] = [];

  // Phase-Based Insights
  if (progressPercent < 20) {
    insights.push({
      id: 'foundation-phase',
      severity: 'info',
      icon: RefreshCw,
      title: 'Foundation Phase Active',
      action: 'Verify soil compaction and footing alignment before proceeding.',
    });
  } else if (progressPercent < 50) {
    insights.push({
      id: 'structure-phase',
      severity: 'info',
      icon: Users,
      title: 'Structural Growth',
      action: 'Columns and vertical load paths are rising. Ensure curing time is respected.',
    });
  } else if (progressPercent < 80) {
    insights.push({
      id: 'roof-phase',
      severity: 'warning',
      icon: Sparkles,
      title: 'Roofing & Enclosure',
      action: 'Prepare for waterproofing and weather-sealing as roof slabs are cast.',
    });
  } else {
    insights.push({
      id: 'finishing-phase',
      severity: 'info',
      icon: CheckCircle,
      title: 'Finishing & MEP',
      action: 'Electrical and plumbing systems installation in progress. Final inspection pending.',
    });
  }

  // Risk Rules
  if (materialRisk > 40) {
    insights.push({
      id: 'material-risk',
      severity: 'critical',
      icon: AlertTriangle,
      title: 'Material Supply Risk',
      action: 'Order materials earlier to avoid procurement delays.',
    });
  }

  if (riskPercent > 10) {
    insights.push({
      id: 'delay-risk',
      severity: 'warning',
      icon: Users,
      title: 'Schedule Delay Risk',
      action: 'Increase workforce on critical path tasks to stay on schedule.',
    });
  }

  if (budgetUsedPercent > 80) {
    insights.push({
      id: 'budget-usage',
      severity: 'critical',
      icon: DollarSign,
      title: 'Budget Threshold Reached',
      action: 'Review cost allocation and identify potential savings.',
    });
  }

  return insights;
}

const severityConfig = {
  critical: {
    badge: 'bg-red-500/10 border border-red-500/30 text-red-400',
    icon: 'text-red-400',
    dot: 'bg-red-500',
  },
  warning: {
    badge: 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
    icon: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  info: {
    badge: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
    icon: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

export default function RecommendationPanel(props: RecommendationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const insights = useMemo(() => generateInsights(props), [
    props.riskPercent,
    props.budgetUsedPercent,
    props.materialRisk,
    props.progressPercent,
  ]);

  return (
    <div className="bg-[#0b0c10] border-2 border-green-500/30 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.05)] flex flex-col relative overflow-hidden transition-all duration-300">
      {/* Glow bar */}
      <div className="absolute top-0 left-0 w-1 h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,1)]" />

      {/* Header - Clickable to toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500" />
          <h3 className="text-xs text-white font-bold tracking-widest uppercase">Actionable Insights</h3>
        </div>
        <div className="flex items-center gap-3">
          {insights.length > 0 && (
            <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
              {insights.length} ITEM{insights.length !== 1 ? 'S' : ''}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100 pb-4 px-4' : 'max-h-0 opacity-0'}`}>
        {/* Empty state */}
        {insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
            <p className="text-xs text-emerald-400 font-bold tracking-wide">No major risks detected</p>
            <p className="text-[0.65rem] text-gray-500 leading-snug max-w-[14rem]">
              All project metrics are within healthy thresholds. Continue monitoring as the simulation progresses.
            </p>
          </div>
        )}

        {/* Insights list */}
        {insights.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {insights.map((insight) => {
              const cfg = severityConfig[insight.severity];
              const Icon = insight.icon;
              return (
                <li
                  key={insight.id}
                  className={`relative flex flex-col gap-1.5 p-3 rounded-lg ${cfg.badge} transition-all border-l-2 border-l-transparent hover:border-l-current`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.icon}`} />
                    <span className={`text-[0.7rem] font-bold tracking-wide ${cfg.icon}`}>
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-[0.67rem] text-gray-300 leading-snug font-medium flex gap-2">
                    <span className="text-gray-500">•</span>
                    {insight.action}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
