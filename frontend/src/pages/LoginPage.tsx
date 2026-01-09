import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">WellTrack</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-gray-600">
            Or{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
              create a new account
            </Link>
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 text-center">Login form will be implemented in task 2.3</p>
        </div>

        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
