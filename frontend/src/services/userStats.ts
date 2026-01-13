import api from './api';
import type { UserStats } from '../types';

export const userStatsService = {
  async getUserStats(): Promise<UserStats> {
    const response = await api.get<{ stats: UserStats }>('/stats');
    return response.data.stats;
  },
};
