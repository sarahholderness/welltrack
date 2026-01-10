import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Select, Slider, Textarea, Button, Alert } from '../ui';
import { symptomsService } from '../../services/symptoms';
import type { Symptom } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../../types';

const symptomLogSchema = z.object({
  symptomId: z.string().min(1, 'Please select a symptom'),
  severity: z.number().min(1).max(10),
  notes: z.string().max(1000).optional(),
  loggedAt: z.string().optional(),
});

type SymptomLogFormData = z.infer<typeof symptomLogSchema>;

interface SymptomLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SymptomLogModal({ isOpen, onClose, onSuccess }: SymptomLogModalProps) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SymptomLogFormData>({
    resolver: zodResolver(symptomLogSchema),
    defaultValues: {
      symptomId: '',
      severity: 5,
      notes: '',
      loggedAt: '', // Set in useEffect when modal opens
    },
  });

  // Fetch symptoms on mount
  useEffect(() => {
    if (isOpen) {
      fetchSymptoms();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Round to nearest 15-minute interval
      const now = new Date();
      const minutes = Math.floor(now.getMinutes() / 15) * 15;
      now.setMinutes(minutes, 0, 0);

      // Format as local datetime (YYYY-MM-DDTHH:mm) without timezone conversion
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${mins}`;

      reset({
        symptomId: '',
        severity: 5,
        notes: '',
        loggedAt: localDateTime,
      });
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, reset]);

  const fetchSymptoms = async () => {
    setIsLoadingSymptoms(true);
    try {
      const data = await symptomsService.getSymptoms();
      // Filter to only active symptoms
      setSymptoms(data.filter((s) => s.isActive));
    } catch (error) {
      console.error('Failed to fetch symptoms:', error);
      setApiError('Failed to load symptoms. Please try again.');
    } finally {
      setIsLoadingSymptoms(false);
    }
  };

  const onSubmit = async (data: SymptomLogFormData) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await symptomsService.createSymptomLog({
        symptomId: data.symptomId,
        severity: data.severity,
        notes: data.notes || undefined,
        loggedAt: data.loggedAt ? new Date(data.loggedAt).toISOString() : undefined,
      });

      setSuccessMessage('Symptom logged successfully!');

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
        setApiError('Failed to log symptom. Please try again.');
      }
    }
  };

  const getSeverityLabel = (value: number) => {
    if (value <= 3) return `${value} - Mild`;
    if (value <= 6) return `${value} - Moderate`;
    return `${value} - Severe`;
  };

  const symptomOptions = symptoms.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Symptom">
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

      {isLoadingSymptoms ? (
        <div className="py-8 text-center text-gray-500">Loading symptoms...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Symptom selector */}
          <Controller
            name="symptomId"
            control={control}
            render={({ field }) => (
              <Select
                label="Symptom"
                options={symptomOptions}
                placeholder="Select a symptom..."
                error={errors.symptomId?.message}
                {...field}
              />
            )}
          />

          {/* Severity slider */}
          <Controller
            name="severity"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Slider
                label="Severity"
                min={1}
                max={10}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                colorScale
                valueLabel={getSeverityLabel}
                error={errors.severity?.message}
                {...field}
              />
            )}
          />

          {/* Notes */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea
                label="Notes (optional)"
                placeholder="Add any additional details..."
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
              // Parse the value (format: YYYY-MM-DDTHH:mm) without timezone conversion
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
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <select
                      value={hours12}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), minutes, period)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                            ? 'bg-primary-500 text-white'
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
                            ? 'bg-primary-500 text-white'
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
              Log Symptom
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
