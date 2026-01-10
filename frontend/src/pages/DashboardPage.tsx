import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboard, useUserStats } from '../hooks';
import { SymptomLogModal, MoodLogModal } from '../components/logging';
import {
  HeartPulseIcon,
  SmileIcon,
  PillIcon,
  ActivityIcon,
  CalendarIcon,
  RefreshIcon,
  TrendingUpIcon,
} from '../components/icons';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { summary, weekActivity, isLoading, error, refresh } = useDashboard();
  const { stats, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useUserStats();
  const [symptomModalOpen, setSymptomModalOpen] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMoodEmoji = (score: number) => {
    const emojis = ['', '😢', '😕', '😐', '🙂', '😊'];
    return emojis[score] || '😐';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Greeting and Date */}
      <div className="flex items-start justify-between">
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
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh dashboard"
        >
          <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Week Streak */}
      {weekActivity && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {weekActivity.daysLogged} of {weekActivity.totalDays} days logged
              </div>
              <div className="text-sm text-gray-500">This week's progress</div>
            </div>
            <div className="ml-auto flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => {
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + i);
                const dateStr = startOfWeek.toISOString().split('T')[0];
                const isLogged = weekActivity.dates.includes(dateStr);
                const isToday = i === new Date().getDay();
                const isFuture = i > new Date().getDay();

                return (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isFuture
                        ? 'bg-gray-100 text-gray-400'
                        : isLogged
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    } ${isToday ? 'ring-2 ring-primary-300' : ''}`}
                    title={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                  >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Your Stats Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Stats</h2>
          </div>
          <button
            onClick={refreshStats}
            disabled={statsLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            aria-label="Refresh stats"
          >
            <RefreshIcon className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {statsError && (
          <div className="p-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {statsError}
              <button onClick={refreshStats} className="ml-2 underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {statsLoading ? (
          <div className="p-6">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <RefreshIcon className="w-5 h-5 animate-spin" />
              <span>Loading stats...</span>
            </div>
          </div>
        ) : stats ? (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Average Mood */}
              <div className="text-center p-3 bg-secondary-50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-600">
                  {stats.averageMoodScore !== null ? stats.averageMoodScore.toFixed(1) : '--'}
                </div>
                {stats.averageMoodScore !== null && (
                  <div className="text-lg mt-0.5">{getMoodEmoji(Math.round(stats.averageMoodScore))}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">Avg Mood (30d)</div>
              </div>

              {/* Current Streak */}
              <div className="text-center p-3 bg-primary-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">
                  {stats.currentStreak}
                </div>
                <div className="text-xs text-gray-500 mt-1">Day Streak</div>
              </div>

              {/* Total Logs */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {stats.totalLogs.symptoms + stats.totalLogs.moods + stats.totalLogs.medications + stats.totalLogs.habits}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total Logs</div>
              </div>

              {/* Log Breakdown */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-center gap-2 text-sm font-medium text-blue-600">
                  <span title="Symptoms">{stats.totalLogs.symptoms}S</span>
                  <span title="Moods">{stats.totalLogs.moods}M</span>
                  <span title="Meds">{stats.totalLogs.medications}R</span>
                  <span title="Habits">{stats.totalLogs.habits}H</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">By Type</div>
              </div>
            </div>

            {/* Top Symptoms */}
            {stats.topSymptoms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-700 mb-2">Top Symptoms (30 days)</div>
                <div className="flex flex-wrap gap-2">
                  {stats.topSymptoms.map((symptom) => (
                    <span
                      key={symptom.symptomId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {symptom.symptomName}
                      <span className="text-primary-500 text-xs">({symptom.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Quick Add Buttons */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Quick Add
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setSymptomModalOpen(true)}
            className="bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-200 p-4 rounded-lg text-left transition-colors group"
          >
            <div className="w-10 h-10 bg-primary-100 group-hover:bg-primary-200 rounded-lg flex items-center justify-center mb-3 transition-colors">
              <HeartPulseIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-gray-900 font-medium">Symptoms</div>
            <div className="text-gray-500 text-sm">Log symptoms</div>
          </button>

          <button
            onClick={() => setMoodModalOpen(true)}
            className="bg-white hover:bg-secondary-50 border border-gray-200 hover:border-secondary-200 p-4 rounded-lg text-left transition-colors group"
          >
            <div className="w-10 h-10 bg-secondary-100 group-hover:bg-secondary-200 rounded-lg flex items-center justify-center mb-3 transition-colors">
              <SmileIcon className="w-5 h-5 text-secondary-600" />
            </div>
            <div className="text-gray-900 font-medium">Mood</div>
            <div className="text-gray-500 text-sm">Track mood</div>
          </button>

          <button
            onClick={() => navigate('/log', { state: { tab: 'medications' } })}
            className="bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 p-4 rounded-lg text-left transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mb-3 transition-colors">
              <PillIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-gray-900 font-medium">Medications</div>
            <div className="text-gray-500 text-sm">Log meds</div>
          </button>

          <button
            onClick={() => navigate('/log', { state: { tab: 'habits' } })}
            className="bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-200 p-4 rounded-lg text-left transition-colors group"
          >
            <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center mb-3 transition-colors">
              <ActivityIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-gray-900 font-medium">Habits</div>
            <div className="text-gray-500 text-sm">Track habits</div>
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Summary</h2>
        </div>

        {error && (
          <div className="p-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
              <button onClick={refresh} className="ml-2 underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <RefreshIcon className="w-5 h-5 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : summary ? (
          <div className="divide-y divide-gray-100">
            {/* Symptom Logs */}
            <SummarySection
              title="Symptoms"
              icon={<HeartPulseIcon className="w-4 h-4 text-primary-600" />}
              count={summary.symptomLogs.length}
              emptyText="No symptoms logged today"
            >
              {summary.symptomLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{log.symptom?.name || 'Unknown'}</span>
                    <SeverityBadge severity={log.severity} />
                  </div>
                  <span className="text-sm text-gray-500">{formatTime(log.loggedAt)}</span>
                </div>
              ))}
            </SummarySection>

            {/* Mood Logs */}
            <SummarySection
              title="Mood"
              icon={<SmileIcon className="w-4 h-4 text-secondary-600" />}
              count={summary.moodLogs.length}
              emptyText="No mood logged today"
            >
              {summary.moodLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getMoodEmoji(log.moodScore)}</span>
                    <span className="text-gray-900">Mood: {log.moodScore}/5</span>
                    {log.energyLevel && (
                      <span className="text-gray-500 text-sm">Energy: {log.energyLevel}/5</span>
                    )}
                    {log.stressLevel && (
                      <span className="text-gray-500 text-sm">Stress: {log.stressLevel}/5</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatTime(log.loggedAt)}</span>
                </div>
              ))}
            </SummarySection>

            {/* Medication Logs */}
            <SummarySection
              title="Medications"
              icon={<PillIcon className="w-4 h-4 text-blue-600" />}
              count={summary.medicationLogs.length}
              emptyText="No medications logged today"
            >
              {summary.medicationLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${log.taken ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span className="text-gray-900">{log.medication?.name || 'Unknown'}</span>
                    <span className="text-sm text-gray-500">
                      {log.taken ? 'Taken' : 'Not taken'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {log.takenAt ? formatTime(log.takenAt) : formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </SummarySection>

            {/* Habit Logs */}
            <SummarySection
              title="Habits"
              icon={<ActivityIcon className="w-4 h-4 text-purple-600" />}
              count={summary.habitLogs.length}
              emptyText="No habits logged today"
            >
              {summary.habitLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{log.habit?.name || 'Unknown'}</span>
                    <HabitValue log={log} />
                  </div>
                  <span className="text-sm text-gray-500">{formatTime(log.loggedAt)}</span>
                </div>
              ))}
            </SummarySection>

            {/* Empty state if nothing logged */}
            {summary.symptomLogs.length === 0 &&
              summary.moodLogs.length === 0 &&
              summary.medicationLogs.length === 0 &&
              summary.habitLogs.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">No logs recorded today yet.</p>
                  <button
                    onClick={() => navigate('/log')}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Start logging
                  </button>
                </div>
              )}
          </div>
        ) : null}
      </div>

      {/* Symptom Log Modal */}
      <SymptomLogModal
        isOpen={symptomModalOpen}
        onClose={() => setSymptomModalOpen(false)}
        onSuccess={() => {
          setSymptomModalOpen(false);
          refresh();
        }}
      />

      {/* Mood Log Modal */}
      <MoodLogModal
        isOpen={moodModalOpen}
        onClose={() => setMoodModalOpen(false)}
        onSuccess={() => {
          setMoodModalOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

// Helper Components
interface SummarySectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}

function SummarySection({ title, icon, count, emptyText, children }: SummarySectionProps) {
  if (count === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-gray-400">
          {icon}
          <span className="text-sm">{emptyText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: number }) {
  let colorClass = 'bg-gray-100 text-gray-600';
  if (severity >= 7) {
    colorClass = 'bg-red-100 text-red-700';
  } else if (severity >= 4) {
    colorClass = 'bg-yellow-100 text-yellow-700';
  } else {
    colorClass = 'bg-green-100 text-green-700';
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {severity}/10
    </span>
  );
}

function HabitValue({ log }: { log: { habit?: { trackingType: string; unit: string | null }; valueBoolean: boolean | null; valueNumeric: number | null; valueDuration: number | null } }) {
  const { habit, valueBoolean, valueNumeric, valueDuration } = log;

  if (habit?.trackingType === 'boolean') {
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          valueBoolean ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {valueBoolean ? 'Yes' : 'No'}
      </span>
    );
  }

  if (habit?.trackingType === 'numeric' && valueNumeric !== null) {
    return (
      <span className="text-sm text-gray-500">
        {valueNumeric} {habit.unit || ''}
      </span>
    );
  }

  if (habit?.trackingType === 'duration' && valueDuration !== null) {
    const hours = Math.floor(valueDuration / 60);
    const minutes = valueDuration % 60;
    return (
      <span className="text-sm text-gray-500">
        {hours > 0 ? `${hours}h ` : ''}
        {minutes}m
      </span>
    );
  }

  return null;
}
