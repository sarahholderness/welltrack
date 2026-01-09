import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services';
import { Input, Button, Alert } from '../components/ui';
import { forgotPasswordSchema } from '../validators/auth';
import type { ForgotPasswordFormData } from '../validators/auth';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export function ForgotPasswordPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null);
    setSuccessMessage(null);
    try {
      const response = await authService.forgotPassword(data.email);
      setSuccessMessage(response.message);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data?.error) {
        setApiError(axiosError.response.data.error);
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">WellTrack</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-gray-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          {apiError && (
            <Alert variant="error" className="mb-6">
              {apiError}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="mb-6">
              {successMessage}
            </Alert>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Send reset link
              </Button>
            </form>
          )}

          {successMessage && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Check your email for the reset link. If you don't see it, check your spam folder.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccessMessage(null);
                  setApiError(null);
                }}
              >
                Send another link
              </Button>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
