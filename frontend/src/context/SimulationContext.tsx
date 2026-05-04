import React, { createContext, useContext, useState } from 'react';

interface SimulationContextType {
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  return (
    <SimulationContext.Provider value={{ speedMultiplier, setSpeedMultiplier }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
