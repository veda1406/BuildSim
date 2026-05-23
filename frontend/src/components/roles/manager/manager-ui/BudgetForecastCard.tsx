import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Check, X, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { API_URL } from '../../../../config';

interface BudgetForecastCardProps {
  currentCost: number;
  project: any;
  onBudgetUpdated: () => void;
}

export default function BudgetForecastCard({ currentCost, project, onBudgetUpdated }: BudgetForecastCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [manualBudget, setManualBudget] = useState<number | string>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setManualBudget(project.final_budget || 0);
    }
  }, [project]);

  const finalBudget = project?.final_budget || 1;
  const estimatedBudget = project?.estimated_budget || 0;
  const isOverridden = project?.is_overridden || false;
  
  const percentUsed = Math.min((currentCost / finalBudget) * 100, 100);
  const forecastCost = currentCost * 1.15; 

  const validateInput = (value: number) => {
    if (value <= 0) return "Budget must be greater than zero.";
    if (estimatedBudget > 0 && value > estimatedBudget * 1000) return "Budget is unrealistically high compared to estimate.";
    return null;
  };

  const handleSave = async () => {
    const parsedBudget = Number(manualBudget);
    if (isNaN(parsedBudget)) {
      setErrorMsg("Please enter a valid number.");
      return;
    }

    const validationError = validateInput(parsedBudget);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await axios.patch(`${API_URL}/projects/${project.id}/budget`, {
        final_budget: parsedBudget,
        is_overridden: true
      });
      setIsEditing(false);
      onBudgetUpdated();
    } catch (err: any) {
      console.error('Failed to update budget', err);
      setErrorMsg(err.response?.data?.detail || "Failed to save the updated budget.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await axios.patch(`${API_URL}/projects/${project.id}/budget`, {
        final_budget: estimatedBudget,
        is_overridden: false
      });
      setIsEditing(false);
      onBudgetUpdated();
    } catch (err: any) {
      console.error('Failed to revert budget', err);
      setErrorMsg(err.response?.data?.detail || "Failed to revert budget.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderBadge = () => {
    if (isOverridden) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[0.6rem] font-bold">
          OVERRIDDEN
        </div>
      );
    } else if (estimatedBudget > 0) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[0.6rem] font-bold">
          ESTIMATED
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#161921] border border-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-3 relative">
      {isSaving && (
        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
        </div>
      )}

      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
           <span className="text-[0.6rem] text-gray-500 tracking-widest uppercase font-bold">Overall Budget</span>
           {renderBadge()}
        </div>
        {!isEditing && (
          <button onClick={() => {setIsEditing(true); setErrorMsg(null);}} className="text-gray-500 hover:text-emerald-500 transition-colors p-1" title="Edit Budget">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      <div className="flex flex-col mb-1">
        <div className="flex justify-between items-end mb-1">
          <span className="text-white font-bold text-lg">
            ₹{currentCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-gray-500 text-sm">/ </span>
          </span>
          <span className="text-emerald-500 text-sm font-bold">{percentUsed.toFixed(1)}%</span>
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-1.5 mt-2">
            <div className={`flex items-center gap-2 bg-[#1a1d24] p-1.5 rounded border ${errorMsg ? 'border-red-500/50' : 'border-gray-700 focus-within:border-emerald-500'}`}>
              <span className="text-gray-400 text-sm pl-1">₹</span>
              <input 
                type="number"
                className="bg-transparent text-white text-sm font-bold w-full outline-none"
                value={manualBudget}
                onChange={(e) => {
                  setManualBudget(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button disabled={isSaving} onClick={handleSave} className="text-emerald-500 hover:bg-emerald-500/20 p-1 rounded transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button disabled={isSaving} onClick={() => {setIsEditing(false); setManualBudget(finalBudget); setErrorMsg(null);}} className="text-red-500 hover:bg-red-500/20 p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-red-400 text-[0.65rem] font-medium bg-red-400/10 p-1.5 rounded">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errorMsg}
              </div>
            )}
            {estimatedBudget > 0 && (
              <div className="text-[0.65rem] text-gray-500 pl-1">Engine Estimate: ₹{estimatedBudget.toLocaleString()}</div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xl">₹{finalBudget.toLocaleString()}</span>
            </div>
            
            {isOverridden && (
              <button 
                onClick={handleRevert}
                className="flex items-center gap-1.5 px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700/50 bg-gray-800/50 rounded-md transition-colors text-xs font-semibold"
                title={`Revert to estimated ₹${estimatedBudget.toLocaleString()}`}
              >
                <RotateCcw className="w-3 h-3 text-amber-500" />
                Revert
              </button>
            )}
          </div>
        )}
      </div>
      
      {!isEditing && (
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
          <div className={`h-full rounded-full transition-all duration-500 ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentUsed}%` }}></div>
        </div>
      )}
      
      {!isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-800/50 flex justify-between items-center text-xs">
          <span className="text-gray-400 font-medium">Forecast Final Cost:</span>
          <span className={`font-bold ${forecastCost > finalBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            ₹{forecastCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}
    </div>
  );
}
