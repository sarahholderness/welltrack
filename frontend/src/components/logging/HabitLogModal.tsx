import { useState, useEffect } from 'react';
import { Modal, Textarea, Button, Alert, Input } from '../ui';
import { habitsService } from '../../services/habits';
import type { Habit, TrackingType } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../../types';

interface HabitLogEntry {
  habitId: string;
  valueBoolean?: boolean;
  valueNumeric?: number;
  valueDuration?: number;
  notes?: string;
}

interface HabitLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HabitLogModal({ isOpen, onClose, onSuccess }: HabitLogModalProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track values for each habit
  const [habitValues, setHabitValues] = useState<Record<string, HabitLogEntry>>({});
  const [globalNotes, setGlobalNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState('');

  // Fetch habits on mount
  useEffect(() => {
    if (isOpen) {
      fetchHabits();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Round to nearest 15-minute interval
      const now = new Date();
      const minutes = Math.floor(now.getMinutes() / 15) * 15;
      now.setMinutes(minutes, 0, 0);

      // Format as local datetime (YYYY-MM-DDTHH:mm)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${mins}`;

      setLoggedAt(localDateTime);
      setHabitValues({});
      setGlobalNotes('');
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const fetchHabits = async () => {
    setIsLoadingHabits(true);
    try {
      const data = await habitsService.getHabits();
      // Filter to only active habits
      setHabits(data.filter((h) => h.isActive));
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      setApiError('Failed to load habits. Please try again.');
    } finally {
      setIsLoadingHabits(false);
    }
  };

  const updateHabitValue = (habitId: string, update: Partial<HabitLogEntry>) => {
    setHabitValues((prev) => ({
      ...prev,
      [habitId]: {
        ...prev[habitId],
        habitId,
        ...update,
      },
    }));
  };

  const toggleBooleanHabit = (habitId: string) => {
    const currentValue = habitValues[habitId]?.valueBoolean;
    updateHabitValue(habitId, { valueBoolean: !currentValue });
  };

  const groupedHabits = habits.reduce(
    (acc, habit) => {
      const type = habit.trackingType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(habit);
      return acc;
    },
    {} as Record<TrackingType, Habit[]>
  );

  const hasAnyValues = () => {
    return Object.values(habitValues).some((entry) => {
      return (
        entry.valueBoolean !== undefined ||
        (entry.valueNumeric !== undefined && entry.valueNumeric > 0) ||
        (entry.valueDuration !== undefined && entry.valueDuration > 0)
      );
    });
  };

  const onSubmit = async () => {
    if (!hasAnyValues()) {
      setApiError('Please log at least one habit.');
      return;
    }

    setApiError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const loggedAtISO = loggedAt ? new Date(loggedAt).toISOString() : undefined;
      const logsToCreate: Array<{
        habitId: string;
        valueBoolean?: boolean;
        valueNumeric?: number;
        valueDuration?: number;
        notes?: string;
        loggedAt?: string;
      }> = [];

      // Collect all habits that have values
      for (const [habitId, entry] of Object.entries(habitValues)) {
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) continue;

        if (habit.trackingType === 'boolean' && entry.valueBoolean !== undefined) {
          logsToCreate.push({
            habitId,
            valueBoolean: entry.valueBoolean,
            notes: globalNotes || undefined,
            loggedAt: loggedAtISO,
          });
        } else if (habit.trackingType === 'numeric' && entry.valueNumeric !== undefined && entry.valueNumeric > 0) {
          logsToCreate.push({
            habitId,
            valueNumeric: entry.valueNumeric,
            notes: globalNotes || undefined,
            loggedAt: loggedAtISO,
          });
        } else if (habit.trackingType === 'duration' && entry.valueDuration !== undefined && entry.valueDuration > 0) {
          logsToCreate.push({
            habitId,
            valueDuration: entry.valueDuration,
            notes: globalNotes || undefined,
            loggedAt: loggedAtISO,
          });
        }
      }

      await Promise.all(logsToCreate.map((log) => habitsService.createHabitLog(log)));

      const count = logsToCreate.length;
      setSuccessMessage(`${count} habit${count > 1 ? 's' : ''} logged successfully!`);

      // Close modal after brief delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data?.error) {
        setApiError(axiosError.response.data.error);
      } else {
        setApiError('Failed to log habits. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBooleanHabit = (habit: Habit) => {
    const isChecked = habitValues[habit.id]?.valueBoolean || false;
    return (
      <div
        key={habit.id}
        onClick={() => toggleBooleanHabit(habit.id)}
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
          isChecked
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span className="font-medium text-gray-900">{habit.name}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateHabitValue(habit.id, { valueBoolean: false });
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              habitValues[habit.id]?.valueBoolean === false
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateHabitValue(habit.id, { valueBoolean: true });
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              habitValues[habit.id]?.valueBoolean === true
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Yes
          </button>
        </div>
      </div>
    );
  };

  const renderNumericHabit = (habit: Habit) => {
    const value = habitValues[habit.id]?.valueNumeric || '';
    return (
      <div key={habit.id} className="p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-gray-900">{habit.name}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              value={value}
              onChange={(e) =>
                updateHabitValue(habit.id, {
                  valueNumeric: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-20 px-2 py-1 border border-gray-300 rounded text-right
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
            {habit.unit && <span className="text-sm text-gray-500">{habit.unit}</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderDurationHabit = (habit: Habit) => {
    const totalMinutes = habitValues[habit.id]?.valueDuration || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const handleDurationChange = (newHours: number, newMinutes: number) => {
      const total = newHours * 60 + newMinutes;
      updateHabitValue(habit.id, { valueDuration: total > 0 ? total : undefined });
    };

    return (
      <div key={habit.id} className="p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-gray-900">{habit.name}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="23"
              value={hours || ''}
              onChange={(e) =>
                handleDurationChange(parseInt(e.target.value) || 0, minutes)
              }
              className="w-16 px-2 py-1 border border-gray-300 rounded text-right
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
            <span className="text-sm text-gray-500">hrs</span>
            <input
              type="number"
              min="0"
              max="59"
              step="5"
              value={minutes || ''}
              onChange={(e) =>
                handleDurationChange(hours, parseInt(e.target.value) || 0)
              }
              className="w-16 px-2 py-1 border border-gray-300 rounded text-right
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
            <span className="text-sm text-gray-500">min</span>
          </div>
        </div>
      </div>
    );
  };

  // Parse loggedAt for the time picker
  const [datePart, timePart] = (loggedAt || '').split('T');
  const [hourStr, minuteStr] = (timePart || '00:00').split(':');
  const hours24 = parseInt(hourStr, 10) || 0;
  const storedMinutes = parseInt(minuteStr, 10) || 0;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const displayMinutes = Math.floor(storedMinutes / 15) * 15;
  const period = hours24 >= 12 ? 'PM' : 'AM';

  const buildLoggedAt = (newDate: string, h24: number, m: number) => {
    const hh = h24.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return `${newDate}T${hh}:${mm}`;
  };

  const handleDateChange = (newDate: string) => {
    setLoggedAt(buildLoggedAt(newDate, hours24, displayMinutes));
  };

  const handleTimeChange = (newHours12: number, newMinutes: number, newPeriod: string) => {
    let h24 = newHours12;
    if (newPeriod === 'AM') {
      h24 = newHours12 === 12 ? 0 : newHours12;
    } else {
      h24 = newHours12 === 12 ? 12 : newHours12 + 12;
    }
    setLoggedAt(buildLoggedAt(datePart, h24, newMinutes));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Habits">
      {apiError && (
        <Alert variant="error" className="mb-4">
          {apiError}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      {isLoadingHabits ? (
        <div className="py-8 text-center text-gray-500">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>No habits found.</p>
          <p className="text-sm mt-2">Add habits in Settings to start logging.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Boolean Habits */}
          {groupedHabits.boolean && groupedHabits.boolean.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Yes/No Habits
              </label>
              <div className="space-y-2">
                {groupedHabits.boolean.map(renderBooleanHabit)}
              </div>
            </div>
          )}

          {/* Numeric Habits */}
          {groupedHabits.numeric && groupedHabits.numeric.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Numeric Habits
              </label>
              <div className="space-y-2">
                {groupedHabits.numeric.map(renderNumericHabit)}
              </div>
            </div>
          )}

          {/* Duration Habits */}
          {groupedHabits.duration && groupedHabits.duration.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Duration Habits
              </label>
              <div className="space-y-2">
                {groupedHabits.duration.map(renderDurationHabit)}
              </div>
            </div>
          )}

          {/* Date/Time Picker */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Date & Time
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={datePart}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1 min-w-0 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <select
                value={hours12}
                onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), displayMinutes, period)}
                className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-gray-500 font-medium">:</span>
              <select
                value={displayMinutes}
                onChange={(e) => handleTimeChange(hours12, parseInt(e.target.value, 10), period)}
                className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours12, displayMinutes, 'AM')}
                  className={`px-2 py-2 text-sm font-medium transition-colors ${
                    period === 'AM'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours12, displayMinutes, 'PM')}
                  className={`px-2 py-2 text-sm font-medium transition-colors ${
                    period === 'PM'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Textarea
            label="Notes (optional)"
            placeholder="Add any additional details..."
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
          />

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              isLoading={isSubmitting}
              className="flex-1"
              disabled={successMessage !== null}
            >
              Log Habits
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
