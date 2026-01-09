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

  // Round to nearest 15-minute interval
  const roundToQuarterHour = (date: Date): string => {
    const rounded = new Date(date);
    const minutes = Math.floor(rounded.getMinutes() / 15) * 15;
    rounded.setMinutes(minutes, 0, 0);
    return rounded.toISOString().slice(0, 16);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        symptomId: '',
        severity: 5,
        notes: '',
        loggedAt: roundToQuarterHour(new Date()),
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
              const date = value ? new Date(value) : new Date();
              const dateStr = date.toISOString().split('T')[0];
              const hours = date.getHours();
              const minutes = Math.floor(date.getMinutes() / 15) * 15;

              const handleDateChange = (newDate: string) => {
                const updated = new Date(value || new Date());
                const [year, month, day] = newDate.split('-').map(Number);
                updated.setFullYear(year, month - 1, day);
                onChange(updated.toISOString().slice(0, 16));
              };

              const handleTimeChange = (newHours: number, newMinutes: number) => {
                const updated = new Date(value || new Date());
                updated.setHours(newHours, newMinutes, 0, 0);
                onChange(updated.toISOString().slice(0, 16));
              };

              return (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Date & Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <select
                      value={hours}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), minutes)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="flex items-center text-gray-500">:</span>
                    <select
                      value={minutes}
                      onChange={(e) => handleTimeChange(hours, parseInt(e.target.value, 10))}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={0}>00</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={45}>45</option>
                    </select>
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
