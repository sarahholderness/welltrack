import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SymptomLogModal, MoodLogModal, MedicationLogModal, HabitLogModal } from '../components/logging';
import {
  HeartPulseIcon,
  SmileIcon,
  PillIcon,
  ActivityIcon,
} from '../components/icons';

type LogTab = 'symptoms' | 'mood' | 'medications' | 'habits';

export function LogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = (location.state as { tab?: LogTab })?.tab || 'symptoms';

  const [activeTab, setActiveTab] = useState<LogTab>(initialTab);
  const [symptomModalOpen, setSymptomModalOpen] = useState(initialTab === 'symptoms');
  const [moodModalOpen, setMoodModalOpen] = useState(initialTab === 'mood');
  const [medicationModalOpen, setMedicationModalOpen] = useState(initialTab === 'medications');
  const [habitModalOpen, setHabitModalOpen] = useState(initialTab === 'habits');

  const handleSymptomSuccess = () => {
    // Navigate to dashboard to see the updated summary
    navigate('/dashboard');
  };

  const tabs = [
    { id: 'symptoms' as const, label: 'Symptoms', icon: HeartPulseIcon, color: 'primary' },
    { id: 'mood' as const, label: 'Mood', icon: SmileIcon, color: 'secondary' },
    { id: 'medications' as const, label: 'Meds', icon: PillIcon, color: 'blue' },
    { id: 'habits' as const, label: 'Habits', icon: ActivityIcon, color: 'purple' },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      primary: {
        active: 'bg-primary-100 text-primary-700 border-primary-500',
        inactive: 'text-gray-600 hover:bg-primary-50 border-transparent',
      },
      secondary: {
        active: 'bg-secondary-100 text-secondary-700 border-secondary-500',
        inactive: 'text-gray-600 hover:bg-secondary-50 border-transparent',
      },
      blue: {
        active: 'bg-blue-100 text-blue-700 border-blue-500',
        inactive: 'text-gray-600 hover:bg-blue-50 border-transparent',
      },
      purple: {
        active: 'bg-purple-100 text-purple-700 border-purple-500',
        inactive: 'text-gray-600 hover:bg-purple-50 border-transparent',
      },
    };
    return isActive ? colors[color].active : colors[color].inactive;
  };

  const handleTabClick = (tabId: LogTab) => {
    setActiveTab(tabId);
    if (tabId === 'symptoms') {
      setSymptomModalOpen(true);
    } else if (tabId === 'mood') {
      setMoodModalOpen(true);
    } else if (tabId === 'medications') {
      setMedicationModalOpen(true);
    } else if (tabId === 'habits') {
      setHabitModalOpen(true);
    }
  };

  const handleMoodSuccess = () => {
    navigate('/dashboard');
  };

  const handleMedicationSuccess = () => {
    navigate('/dashboard');
  };

  const handleHabitSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Log Entry</h1>
        <p className="text-gray-600 mt-1">Track your symptoms, mood, medications, and habits</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium
              transition-colors whitespace-nowrap
              ${getColorClasses(tab.color, activeTab === tab.id)}
            `}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'symptoms' && (
          <div className="text-center py-8">
            <HeartPulseIcon className="w-12 h-12 mx-auto text-primary-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Log a Symptom</h3>
            <p className="text-gray-500 mb-4">
              Track symptom severity and notes to identify patterns over time.
            </p>
            <button
              onClick={() => setSymptomModalOpen(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Symptom Entry
            </button>
          </div>
        )}

        {activeTab === 'mood' && (
          <div className="text-center py-8">
            <SmileIcon className="w-12 h-12 mx-auto text-secondary-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Log Your Mood</h3>
            <p className="text-gray-500 mb-4">
              Track your mood, energy, and stress levels to identify patterns over time.
            </p>
            <button
              onClick={() => setMoodModalOpen(true)}
              className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
            >
              Add Mood Entry
            </button>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="text-center py-8">
            <PillIcon className="w-12 h-12 mx-auto text-blue-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Log Medications</h3>
            <p className="text-gray-500 mb-4">
              Track which medications you've taken and when.
            </p>
            <button
              onClick={() => setMedicationModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Medication Entry
            </button>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="text-center py-8">
            <ActivityIcon className="w-12 h-12 mx-auto text-purple-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Log Habits</h3>
            <p className="text-gray-500 mb-4">
              Track your daily habits like sleep, exercise, water intake, and more.
            </p>
            <button
              onClick={() => setHabitModalOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Habit Entry
            </button>
          </div>
        )}
      </div>

      {/* Symptom Log Modal */}
      <SymptomLogModal
        isOpen={symptomModalOpen}
        onClose={() => setSymptomModalOpen(false)}
        onSuccess={handleSymptomSuccess}
      />

      {/* Mood Log Modal */}
      <MoodLogModal
        isOpen={moodModalOpen}
        onClose={() => setMoodModalOpen(false)}
        onSuccess={handleMoodSuccess}
      />

      {/* Medication Log Modal */}
      <MedicationLogModal
        isOpen={medicationModalOpen}
        onClose={() => setMedicationModalOpen(false)}
        onSuccess={handleMedicationSuccess}
      />

      {/* Habit Log Modal */}
      <HabitLogModal
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onSuccess={handleHabitSuccess}
      />
    </div>
  );
}
