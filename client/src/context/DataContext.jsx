import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getDashboardStats } from '../services/dataService';
const DataContext = createContext(null);
export function DataProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => { setStats(getDashboardStats()); }, [tick]);
  return <DataContext.Provider value={{ stats, refresh }}>{children}</DataContext.Provider>;
}
export function useData() { return useContext(DataContext); }
