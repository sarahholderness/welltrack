import api from './api';
import type { Habit, HabitLog, TrackingType } from '../types';

export interface CreateHabitData {
  name: string;
  trackingType: TrackingType;
  unit?: string;
}

export interface UpdateHabitData {
  name?: string;
  trackingType?: TrackingType;
  unit?: string;
  isActive?: boolean;
}

export interface CreateHabitLogData {
  habitId: string;
  valueBoolean?: boolean;
  valueNumeric?: number;
  valueDuration?: number;
  notes?: string;
  loggedAt?: string;
}

export interface UpdateHabitLogData {
  valueBoolean?: boolean;
  valueNumeric?: number;
  valueDuration?: number;
  notes?: string;
  loggedAt?: string;
}

export interface HabitLogsResponse {
  logs: HabitLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetHabitLogsParams {
  startDate?: string;
  endDate?: string;
  habitId?: string;
  page?: number;
  limit?: number;
}

export const habitsService = {
  // Habit CRUD
  async getHabits(): Promise<Habit[]> {
    const response = await api.get<{ habits: Habit[] }>('/habits');
    return response.data.habits;
  },

  async createHabit(data: CreateHabitData): Promise<Habit> {
    const response = await api.post<{ habit: Habit }>('/habits', data);
    return response.data.habit;
  },

  async updateHabit(id: string, data: UpdateHabitData): Promise<Habit> {
    const response = await api.patch<{ habit: Habit }>(`/habits/${id}`, data);
    return response.data.habit;
  },

  async deleteHabit(id: string): Promise<void> {
    await api.delete(`/habits/${id}`);
  },

  // Habit Log CRUD
  async getHabitLogs(params?: GetHabitLogsParams): Promise<HabitLogsResponse> {
    const response = await api.get<HabitLogsResponse>('/habit-logs', { params });
    return response.data;
  },

  async createHabitLog(data: CreateHabitLogData): Promise<HabitLog> {
    const response = await api.post<{ log: HabitLog }>('/habit-logs', data);
    return response.data.log;
  },

  async updateHabitLog(id: string, data: UpdateHabitLogData): Promise<HabitLog> {
    const response = await api.patch<{ log: HabitLog }>(`/habit-logs/${id}`, data);
    return response.data.log;
  },

  async deleteHabitLog(id: string): Promise<void> {
    await api.delete(`/habit-logs/${id}`);
  },
};
