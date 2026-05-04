import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', msg: 'Budget overrun risk in Framing phase' },
    { id: 2, type: 'danger', msg: 'High delay risk due to material shortage' }
  ]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map(alert => (
        <div key={alert.id} className={`flex items-start justify-between p-3 rounded-lg border ${alert.type === 'danger' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-2">
             <AlertTriangle className={`w-4 h-4 ${alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
             <span className={`text-[0.7rem] font-semibold ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>{alert.msg}</span>
          </div>
          <button onClick={() => setAlerts(a => a.filter(x => x.id !== alert.id))} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
