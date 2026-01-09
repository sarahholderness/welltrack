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

      reset({
        symptomId: '',
        severity: 5,
        notes: '',
        loggedAt: now.toISOString().slice(0, 16),
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
      // Round to nearest 15-minute interval
      let loggedAt: string | undefined;
      if (data.loggedAt) {
        const date = new Date(data.loggedAt);
        const minutes = Math.round(date.getMinutes() / 15) * 15;
        date.setMinutes(minutes, 0, 0);
        loggedAt = date.toISOString();
      }

      await symptomsService.createSymptomLog({
        symptomId: data.symptomId,
        severity: data.severity,
        notes: data.notes || undefined,
        loggedAt,
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
            render={({ field }) => (
              <div className="space-y-1">
                <label
                  htmlFor="logged-at"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="logged-at"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  {...field}
                />
              </div>
            )}
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
