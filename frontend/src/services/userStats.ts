import api from './api';
import type { UserStats } from '../types';

export const userStatsService = {
  async getUserStats(): Promise<UserStats> {
    const response = await api.get<{ stats: UserStats }>('/users/me/stats');
    return response.data.stats;
  },
};
