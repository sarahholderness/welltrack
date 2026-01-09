import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  PlusCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  SettingsIcon,
  XIcon,
} from '../icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/log', label: 'Log', icon: PlusCircleIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
  { to: '/trends', label: 'Trends', icon: TrendingUpIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo and close button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span className="text-xl font-bold text-primary-600">WellTrack</span>
        <button
          type="button"
          className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded"
          onClick={onClose}
          aria-label="Close menu"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
