import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary-600">WellTrack</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {user?.displayName || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to WellTrack!</h2>
          <p className="text-gray-600 mb-6">
            This is your dashboard. The full dashboard will be implemented in task 2.5.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg text-center">
              <div className="text-primary-600 font-semibold">Symptoms</div>
              <div className="text-gray-500 text-sm">Log symptoms</div>
            </div>
            <div className="bg-secondary-50 p-4 rounded-lg text-center">
              <div className="text-secondary-600 font-semibold">Mood</div>
              <div className="text-gray-500 text-sm">Track mood</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-blue-600 font-semibold">Medications</div>
              <div className="text-gray-500 text-sm">Log meds</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-purple-600 font-semibold">Habits</div>
              <div className="text-gray-500 text-sm">Track habits</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
