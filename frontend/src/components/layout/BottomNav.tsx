import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  PlusCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  SettingsIcon,
} from '../icons';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/log', label: 'Log', icon: PlusCircleIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
  { to: '/trends', label: 'Trends', icon: TrendingUpIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
      <ul className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full px-2 transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
