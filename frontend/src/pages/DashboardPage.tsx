import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting()}, {user?.displayName || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Today's Summary placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
        <p className="text-gray-500 text-sm">
          Full dashboard will be implemented in task 2.5.
        </p>
      </div>

      {/* Quick add buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="bg-primary-50 hover:bg-primary-100 p-4 rounded-lg text-center transition-colors">
          <div className="text-primary-600 font-semibold">Symptoms</div>
          <div className="text-gray-500 text-sm">Log symptoms</div>
        </button>
        <button className="bg-secondary-50 hover:bg-secondary-100 p-4 rounded-lg text-center transition-colors">
          <div className="text-secondary-600 font-semibold">Mood</div>
          <div className="text-gray-500 text-sm">Track mood</div>
        </button>
        <button className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-center transition-colors">
          <div className="text-blue-600 font-semibold">Medications</div>
          <div className="text-gray-500 text-sm">Log meds</div>
        </button>
        <button className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-center transition-colors">
          <div className="text-purple-600 font-semibold">Habits</div>
          <div className="text-gray-500 text-sm">Track habits</div>
        </button>
      </div>
    </div>
  );
}
