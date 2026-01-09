import api from './api';
import type {
  SymptomLog,
  MoodLog,
  MedicationLog,
  HabitLog,
  PaginatedResponse,
} from '../types';

export interface TodaysSummary {
  symptomLogs: SymptomLog[];
  moodLogs: MoodLog[];
  medicationLogs: MedicationLog[];
  habitLogs: HabitLog[];
}

export interface WeekActivity {
  daysLogged: number;
  totalDays: number;
  dates: string[];
}

// Get the start and end of today in ISO format
function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
}

// Get the start and end of the current week (Sunday to Saturday)
function getWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);

  return {
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString(),
  };
}

export const dashboardService = {
  async getTodaysSummary(): Promise<TodaysSummary> {
    const { startDate, endDate } = getTodayRange();

    const [symptomRes, moodRes, medicationRes, habitRes] = await Promise.all([
      api.get<PaginatedResponse<SymptomLog>>('/symptom-logs', {
        params: { startDate, endDate, limit: 50 },
      }),
      api.get<PaginatedResponse<MoodLog>>('/mood-logs', {
        params: { startDate, endDate, limit: 50 },
      }),
      api.get<PaginatedResponse<MedicationLog>>('/medication-logs', {
        params: { startDate, endDate, limit: 50 },
      }),
      api.get<PaginatedResponse<HabitLog>>('/habit-logs', {
        params: { startDate, endDate, limit: 50 },
      }),
    ]);

    return {
      symptomLogs: symptomRes.data.data,
      moodLogs: moodRes.data.data,
      medicationLogs: medicationRes.data.data,
      habitLogs: habitRes.data.data,
    };
  },

  async getWeekActivity(): Promise<WeekActivity> {
    const { startDate, endDate } = getWeekRange();

    // Fetch all logs for the week to determine which days have activity
    const [symptomRes, moodRes, medicationRes, habitRes] = await Promise.all([
      api.get<PaginatedResponse<SymptomLog>>('/symptom-logs', {
        params: { startDate, endDate, limit: 100 },
      }),
      api.get<PaginatedResponse<MoodLog>>('/mood-logs', {
        params: { startDate, endDate, limit: 100 },
      }),
      api.get<PaginatedResponse<MedicationLog>>('/medication-logs', {
        params: { startDate, endDate, limit: 100 },
      }),
      api.get<PaginatedResponse<HabitLog>>('/habit-logs', {
        params: { startDate, endDate, limit: 100 },
      }),
    ]);

    // Collect all unique dates with activity
    const activeDates = new Set<string>();

    const addDates = (logs: Array<{ loggedAt?: string; createdAt: string }>) => {
      logs.forEach((log) => {
        const date = new Date(log.loggedAt || log.createdAt).toISOString().split('T')[0];
        activeDates.add(date);
      });
    };

    addDates(symptomRes.data.data);
    addDates(moodRes.data.data);
    addDates(medicationRes.data.data);
    addDates(habitRes.data.data);

    // Calculate days up to and including today
    const today = new Date();
    const dayOfWeek = today.getDay();
    const totalDays = dayOfWeek + 1; // Days from Sunday to today (inclusive)

    return {
      daysLogged: activeDates.size,
      totalDays,
      dates: Array.from(activeDates).sort(),
    };
  },
};
