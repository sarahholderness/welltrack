import api from './api';
import type { Medication, MedicationLog, PaginatedResponse } from '../types';

export interface CreateMedicationData {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface UpdateMedicationData {
  name?: string;
  dosage?: string;
  frequency?: string;
  isActive?: boolean;
}

export interface CreateMedicationLogData {
  medicationId: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
}

export interface UpdateMedicationLogData {
  taken?: boolean;
  takenAt?: string | null;
  notes?: string;
}

export interface MedicationLogsResponse {
  logs: MedicationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetMedicationLogsParams {
  startDate?: string;
  endDate?: string;
  medicationId?: string;
  page?: number;
  limit?: number;
}

export const medicationsService = {
  // Medication CRUD
  async getMedications(): Promise<Medication[]> {
    const response = await api.get<{ medications: Medication[] }>('/medications');
    return response.data.medications;
  },

  async createMedication(data: CreateMedicationData): Promise<Medication> {
    const response = await api.post<{ medication: Medication }>('/medications', data);
    return response.data.medication;
  },

  async updateMedication(id: string, data: UpdateMedicationData): Promise<Medication> {
    const response = await api.patch<{ medication: Medication }>(`/medications/${id}`, data);
    return response.data.medication;
  },

  async deleteMedication(id: string): Promise<void> {
    await api.delete(`/medications/${id}`);
  },

  // Medication Log CRUD
  async getMedicationLogs(params?: GetMedicationLogsParams): Promise<MedicationLogsResponse> {
    const response = await api.get<MedicationLogsResponse>('/medication-logs', { params });
    return response.data;
  },

  async createMedicationLog(data: CreateMedicationLogData): Promise<MedicationLog> {
    const response = await api.post<{ log: MedicationLog }>('/medication-logs', data);
    return response.data.log;
  },

  async updateMedicationLog(id: string, data: UpdateMedicationLogData): Promise<MedicationLog> {
    const response = await api.patch<{ log: MedicationLog }>(`/medication-logs/${id}`, data);
    return response.data.log;
  },

  async deleteMedicationLog(id: string): Promise<void> {
    await api.delete(`/medication-logs/${id}`);
  },
};
