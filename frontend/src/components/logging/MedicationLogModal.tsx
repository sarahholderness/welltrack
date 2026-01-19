import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Textarea, Button, Alert, Checkbox } from '../ui';
import { medicationsService } from '../../services/medications';
import type { Medication } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../../types';

const medicationLogSchema = z.object({
  selectedMedications: z.array(z.string()).min(1, 'Please select at least one medication'),
  takenAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type MedicationLogFormData = z.infer<typeof medicationLogSchema>;

interface MedicationLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MedicationLogModal({ isOpen, onClose, onSuccess }: MedicationLogModalProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoadingMedications, setIsLoadingMedications] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicationLogFormData>({
    resolver: zodResolver(medicationLogSchema),
    defaultValues: {
      selectedMedications: [],
      takenAt: '',
      notes: '',
    },
  });

  const selectedMedications = watch('selectedMedications');

  // Fetch medications on mount
  useEffect(() => {
    if (isOpen) {
      fetchMedications();
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

      reset({
        selectedMedications: [],
        takenAt: localDateTime,
        notes: '',
      });
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, reset]);

  const fetchMedications = async () => {
    setIsLoadingMedications(true);
    try {
      const data = await medicationsService.getMedications();
      // Filter to only active medications
      setMedications(data.filter((m) => m.isActive));
    } catch (error) {
      console.error('Failed to fetch medications:', error);
      setApiError('Failed to load medications. Please try again.');
    } finally {
      setIsLoadingMedications(false);
    }
  };

  const toggleMedication = (medicationId: string) => {
    const current = selectedMedications || [];
    if (current.includes(medicationId)) {
      setValue(
        'selectedMedications',
        current.filter((id) => id !== medicationId)
      );
    } else {
      setValue('selectedMedications', [...current, medicationId]);
    }
  };

  const onSubmit = async (data: MedicationLogFormData) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      // Create a log for each selected medication
      const takenAt = data.takenAt ? new Date(data.takenAt).toISOString() : undefined;

      await Promise.all(
        data.selectedMedications.map((medicationId) =>
          medicationsService.createMedicationLog({
            medicationId,
            taken: true,
            takenAt,
            notes: data.notes || undefined,
          })
        )
      );

      const count = data.selectedMedications.length;
      setSuccessMessage(`${count} medication${count > 1 ? 's' : ''} logged successfully!`);

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
        setApiError('Failed to log medications. Please try again.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Medications">
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

      {isLoadingMedications ? (
        <div className="py-8 text-center text-gray-500">Loading medications...</div>
      ) : medications.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>No medications found.</p>
          <p className="text-sm mt-2">Add medications in Settings to start logging.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Medication checkboxes */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Select Medications Taken
            </label>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  onClick={() => toggleMedication(medication.id)}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMedications?.includes(medication.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={selectedMedications?.includes(medication.id) || false}
                    onChange={() => toggleMedication(medication.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{medication.name}</div>
                    {(medication.dosage || medication.frequency) && (
                      <div className="text-sm text-gray-500">
                        {[medication.dosage, medication.frequency].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.selectedMedications && (
              <p className="text-sm text-red-600 mt-1">{errors.selectedMedications.message}</p>
            )}
          </div>

          {/* Taken at time picker */}
          <Controller
            name="takenAt"
            control={control}
            render={({ field: { value, onChange } }) => {
              // Parse the value (format: YYYY-MM-DDTHH:mm)
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
                    Taken At
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
              Log Medications
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
