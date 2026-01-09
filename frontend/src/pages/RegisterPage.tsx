import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context';
import { Input, Button, Alert } from '../components/ui';
import { registerSchema } from '../validators/auth';
import type { RegisterFormData } from '../validators/auth';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data?.error) {
        setApiError(axiosError.response.data.error);
      } else if (axiosError.response?.data?.details) {
        const messages = axiosError.response.data.details.map((d) => d.message).join('. ');
        setApiError(messages);
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">WellTrack</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Create your account</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          {apiError && (
            <Alert variant="error" className="mb-6">
              {apiError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Display name (optional)"
              type="text"
              autoComplete="name"
              placeholder="How should we call you?"
              error={errors.displayName?.message}
              {...register('displayName')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          By creating an account, you agree to track your wellness journey with WellTrack.
        </p>
      </div>
    </div>
  );
}
