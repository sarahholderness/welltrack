import api from './api';
import type { Symptom, SymptomLog, PaginatedResponse } from '../types';

export interface CreateSymptomLogData {
  symptomId: string;
  severity: number;
  notes?: string;
  loggedAt?: string;
}

export const symptomsService = {
  async getSymptoms(): Promise<Symptom[]> {
    const response = await api.get<{ symptoms: Symptom[] }>('/symptoms');
    return response.data.symptoms;
  },

  async createSymptomLog(data: CreateSymptomLogData): Promise<SymptomLog> {
    const response = await api.post<{ log: SymptomLog }>('/symptom-logs', data);
    return response.data.log;
  },

  async getSymptomLogs(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SymptomLog>> {
    const response = await api.get<PaginatedResponse<SymptomLog>>('/symptom-logs', { params });
    return response.data;
  },
};
