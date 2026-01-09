// User types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  createdAt: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse extends AuthTokens {
  user: User;
}

// Symptom types
export interface Symptom {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  userId: string | null;
  createdAt: string;
}

export interface SymptomLog {
  id: string;
  symptomId: string;
  severity: number;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
  symptom?: Symptom;
}

// Mood types
export interface MoodLog {
  id: string;
  moodScore: number;
  energyLevel: number | null;
  stressLevel: number | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

// Medication types
export interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  taken: boolean;
  takenAt: string | null;
  notes: string | null;
  createdAt: string;
  medication?: Medication;
}

// Habit types
export type TrackingType = 'boolean' | 'numeric' | 'duration';

export interface Habit {
  id: string;
  name: string;
  trackingType: TrackingType;
  unit: string | null;
  isActive: boolean;
  userId: string | null;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueDuration: number | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
  habit?: Habit;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
