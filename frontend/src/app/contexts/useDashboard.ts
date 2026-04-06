import { useContext } from 'react';
import { DashboardContext } from './DashboardContextStore';

export const useDashboard = () => {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }

  return context;
};
