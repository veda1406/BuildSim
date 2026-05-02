export default function RiskBreakdown() {
  const risks = [
    { label: 'Weather Risk', level: 15, color: 'bg-green-500', text: 'text-green-500' },
    { label: 'Material Supply', level: 45, color: 'bg-amber-500', text: 'text-amber-500' },
    { label: 'Labor Availability', level: 10, color: 'bg-green-500', text: 'text-green-500' },
  ];

  return (
    <div className="bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-4">
      <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold block mb-1">Risk Breakdown</span>
      
      <div className="flex flex-col gap-3">
        {risks.map((risk, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">{risk.label}</span>
              <span className={risk.text}>{risk.level}%</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${risk.color}`} style={{ width: `${risk.level}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
