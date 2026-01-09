import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services';
import { Input, Button, Alert } from '../components/ui';
import { resetPasswordSchema } from '../validators/auth';
import type { ResetPasswordFormData } from '../validators/auth';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setApiError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    setApiError(null);
    try {
      await authService.resetPassword({
        token,
        password: data.password,
      });
      setSuccessMessage('Your password has been reset successfully.');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data?.error) {
        setApiError(axiosError.response.data.error);
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary-600">WellTrack</h1>
            <h2 className="mt-6 text-2xl font-semibold text-gray-900">Invalid Reset Link</h2>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <Alert variant="error" className="mb-6">
              This password reset link is invalid or has expired.
            </Alert>
            <div className="text-center">
              <Link to="/forgot-password">
                <Button variant="primary">Request a new reset link</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">WellTrack</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Set new password</h2>
          <p className="mt-2 text-gray-600">Enter your new password below</p>
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
              <p className="text-sm mt-2">Redirecting to login...</p>
            </Alert>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Reset password
              </Button>
            </form>
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
