import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProjectHealthCardProps {
  riskPercent: number;
  budgetUsedPercent: number;
}

export default function ProjectHealthCard({ riskPercent, budgetUsedPercent }: ProjectHealthCardProps) {
  let status = 'GOOD';
  let bgColor = 'bg-green-500/10';
  let textColor = 'text-green-500';
  let borderColor = 'border-green-500/30';
  let Icon = CheckCircle;

  if (riskPercent > 20 || budgetUsedPercent > 90) {
    status = 'CRITICAL';
    bgColor = 'bg-red-500/10';
    textColor = 'text-red-500';
    borderColor = 'border-red-500/30';
    Icon = AlertTriangle;
  } else if (riskPercent > 10 || budgetUsedPercent > 70) {
    status = 'AT RISK';
    bgColor = 'bg-amber-500/10';
    textColor = 'text-amber-500';
    borderColor = 'border-amber-500/30';
    Icon = Activity;
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border shadow-lg ${bgColor} ${borderColor}`}>
      <div>
        <span className="text-[0.6rem] text-gray-400 tracking-widest uppercase font-bold block mb-1">Project Health</span>
        <span className={`font-black tracking-wider text-xl ${textColor}`}>{status}</span>
      </div>
      <Icon className={`w-8 h-8 ${textColor}`} />
    </div>
  );
}
