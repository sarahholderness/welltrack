import api from './api';
import type { MoodLog } from '../types';

export interface CreateMoodLogData {
  moodScore: number;
  energyLevel?: number;
  stressLevel?: number;
  notes?: string;
  loggedAt?: string;
}

export interface MoodLogsResponse {
  logs: MoodLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const moodService = {
  async createMoodLog(data: CreateMoodLogData): Promise<MoodLog> {
    const response = await api.post<{ log: MoodLog }>('/mood-logs', data);
    return response.data.log;
  },

  async getMoodLogs(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<MoodLogsResponse> {
    const response = await api.get<MoodLogsResponse>('/mood-logs', { params });
    return response.data;
  },

  async updateMoodLog(
    id: string,
    data: Partial<CreateMoodLogData>
  ): Promise<MoodLog> {
    const response = await api.patch<{ log: MoodLog }>(`/mood-logs/${id}`, data);
    return response.data.log;
  },

  async deleteMoodLog(id: string): Promise<void> {
    await api.delete(`/mood-logs/${id}`);
  },
};
