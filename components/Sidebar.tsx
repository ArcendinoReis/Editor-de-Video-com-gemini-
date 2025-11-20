import React from 'react';
import { FileText, Film, Music, Settings, Video, PlaySquare } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: AppView.SCRIPT, icon: FileText, label: 'Roteiro' },
    { id: AppView.SCENES, icon: Film, label: 'Cenas' },
    { id: AppView.MUSIC, icon: Music, label: 'Música' },
  ];

  return (
    <div className="w-20 bg-white h-screen flex flex-col items-center py-6 border-r border-gray-200 shadow-sm z-10 flex-shrink-0">
      <div className="mb-8 text-purple-600">
        <Video size={32} />
      </div>

      <nav className="flex flex-col w-full gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex flex-col items-center justify-center w-full py-4 transition-colors relative
              ${currentView === item.id ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <item.icon size={24} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className="text-xs mt-1 font-medium">{item.label}</span>
            {currentView === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 text-gray-400">
         <button className="p-2 hover:text-gray-600"><Settings size={20} /></button>
      </div>
    </div>
  );
};