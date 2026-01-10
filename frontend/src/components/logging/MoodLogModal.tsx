import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Textarea, Button, Alert } from '../ui';
import { moodService } from '../../services/mood';
import type { AxiosError } from 'axios';
import type { ApiError } from '../../types';

const moodLogSchema = z.object({
  moodScore: z.number().min(1).max(5),
  energyLevel: z.number().min(1).max(5).optional(),
  stressLevel: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  loggedAt: z.string().optional(),
});

type MoodLogFormData = z.infer<typeof moodLogSchema>;

interface MoodLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Very Low', color: 'bg-red-100 border-red-300 hover:bg-red-200' },
  { value: 2, emoji: '😕', label: 'Low', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
  { value: 3, emoji: '😐', label: 'Neutral', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
  { value: 4, emoji: '🙂', label: 'Good', color: 'bg-lime-100 border-lime-300 hover:bg-lime-200' },
  { value: 5, emoji: '😊', label: 'Great', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
];

const ENERGY_OPTIONS = [
  { value: 1, label: 'Exhausted' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'High' },
];

const STRESS_OPTIONS = [
  { value: 1, label: 'Calm' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Very High' },
];

export function MoodLogModal({ isOpen, onClose, onSuccess }: MoodLogModalProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MoodLogFormData>({
    resolver: zodResolver(moodLogSchema),
    defaultValues: {
      moodScore: 3,
      energyLevel: undefined,
      stressLevel: undefined,
      notes: '',
      loggedAt: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const minutes = Math.floor(now.getMinutes() / 15) * 15;
      now.setMinutes(minutes, 0, 0);

      reset({
        moodScore: 3,
        energyLevel: undefined,
        stressLevel: undefined,
        notes: '',
        loggedAt: now.toISOString().slice(0, 16),
      });
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: MoodLogFormData) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await moodService.createMoodLog({
        moodScore: data.moodScore,
        energyLevel: data.energyLevel,
        stressLevel: data.stressLevel,
        notes: data.notes || undefined,
        loggedAt: data.loggedAt ? new Date(data.loggedAt).toISOString() : undefined,
      });

      setSuccessMessage('Mood logged successfully!');

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data?.error) {
        setApiError(axiosError.response.data.error);
      } else {
        setApiError('Failed to log mood. Please try again.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Mood">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Mood selector */}
        <Controller
          name="moodScore"
          control={control}
          render={({ field: { value, onChange } }) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                How are you feeling?
              </label>
              <div className="flex justify-between gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`
                      flex-1 flex flex-col items-center py-3 px-2 rounded-lg border-2 transition-all
                      ${value === option.value
                        ? `${option.color} border-2 ring-2 ring-offset-1 ring-secondary-400`
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-2xl mb-1">{option.emoji}</span>
                    <span className="text-xs text-gray-600">{option.label}</span>
                  </button>
                ))}
              </div>
              {errors.moodScore && (
                <p className="text-sm text-red-600">{errors.moodScore.message}</p>
              )}
            </div>
          )}
        />

        {/* Energy level (optional) */}
        <Controller
          name="energyLevel"
          control={control}
          render={({ field: { value, onChange } }) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Energy Level <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                {ENERGY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(value === option.value ? undefined : option.value)}
                    className={`
                      flex-1 py-2 px-1 rounded-lg border text-sm transition-all
                      ${value === option.value
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="font-medium">{option.value}</div>
                    <div className="text-xs truncate">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        />

        {/* Stress level (optional) */}
        <Controller
          name="stressLevel"
          control={control}
          render={({ field: { value, onChange } }) => (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Stress Level <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                {STRESS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(value === option.value ? undefined : option.value)}
                    className={`
                      flex-1 py-2 px-1 rounded-lg border text-sm transition-all
                      ${value === option.value
                        ? 'bg-purple-100 border-purple-400 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="font-medium">{option.value}</div>
                    <div className="text-xs truncate">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        />

        {/* Notes */}
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Textarea
              label="Notes (optional)"
              placeholder="Add any additional details about how you're feeling..."
              error={errors.notes?.message}
              {...field}
            />
          )}
        />

        {/* Date/time picker */}
        <Controller
          name="loggedAt"
          control={control}
          render={({ field: { value, onChange } }) => {
            const [datePart, timePart] = (value || '').split('T');
            const [hourStr, minuteStr] = (timePart || '00:00').split(':');
            const hours24 = parseInt(hourStr, 10) || 0;
            const storedMinutes = parseInt(minuteStr, 10) || 0;
            const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
            const minutes = Math.floor(storedMinutes / 15) * 15;
            const period = hours24 >= 12 ? 'PM' : 'AM';

            const buildValue = (newDate: string, h24: number, m: number) => {
              const hh = h24.toString().padStart(2, '0');
              const mm = m.toString().padStart(2, '0');
              return `${newDate}T${hh}:${mm}`;
            };

            const handleDateChange = (newDate: string) => {
              onChange(buildValue(newDate, hours24, minutes));
            };

            const handleTimeChange = (newHours12: number, newMinutes: number, newPeriod: string) => {
              let h24 = newHours12;
              if (newPeriod === 'AM') {
                h24 = newHours12 === 12 ? 0 : newHours12;
              } else {
                h24 = newHours12 === 12 ? 12 : newHours12 + 12;
              }
              onChange(buildValue(datePart, h24, newMinutes));
            };

            return (
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
                      focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                  />
                  <select
                    value={hours12}
                    onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), minutes, period)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-medium">:</span>
                  <select
                    value={minutes}
                    onChange={(e) => handleTimeChange(hours12, parseInt(e.target.value, 10), period)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                  >
                    <option value={0}>00</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                  </select>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleTimeChange(hours12, minutes, 'AM')}
                      className={`px-2 py-2 text-sm font-medium transition-colors ${
                        period === 'AM'
                          ? 'bg-secondary-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeChange(hours12, minutes, 'PM')}
                      className={`px-2 py-2 text-sm font-medium transition-colors ${
                        period === 'PM'
                          ? 'bg-secondary-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
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
            type="submit"
            isLoading={isSubmitting}
            className="flex-1"
            disabled={successMessage !== null}
          >
            Log Mood
          </Button>
        </div>
      </form>
    </Modal>
  );
}
