import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services';
import type { TodaysSummary, WeekActivity } from '../services';

interface UseDashboardReturn {
  summary: TodaysSummary | null;
  weekActivity: WeekActivity | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [summary, setSummary] = useState<TodaysSummary | null>(null);
  const [weekActivity, setWeekActivity] = useState<WeekActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [summaryData, activityData] = await Promise.all([
        dashboardService.getTodaysSummary(),
        dashboardService.getWeekActivity(),
      ]);

      setSummary(summaryData);
      setWeekActivity(activityData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    weekActivity,
    isLoading,
    error,
    refresh: fetchData,
  };
}
