
import React from 'react';
import { Home, Trophy, ShoppingBag, User as UserIcon } from 'lucide-react';
import { Page, User } from '../types';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, user }) => {
  // Hide navigation for guests
  if (!user) return null;

  const navItems = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'RANK', icon: Trophy, label: 'Rank' },
    { id: 'SHOP', icon: ShoppingBag, label: 'Shop' },
    { id: 'PROFILE', icon: UserIcon, label: 'Profile' },
  ] as const;

  return (
    <>
      {/* MOBILE BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-black/80 backdrop-blur-md border-t border-white/10 z-[100] flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-200 ${isActive ? 'text-yellow-400 -translate-y-1' : 'text-gray-400 hover:text-white'
                }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : ''} />
              <span className={`text-[10px] mt-1 font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* DESKTOP RIGHT SIDEBAR */}
      <div className="hidden md:flex fixed right-0 top-0 h-full w-24 bg-black/40 backdrop-blur-md border-l border-white/10 z-[100] flex-col items-center pt-24 gap-8">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 ${isActive
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={28} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{item.label}</span>

              {/* Active Indicator Line on Right */}
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-yellow-400 rounded-l-full shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default Navigation;
