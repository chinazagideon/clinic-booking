import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { NavPillGroup, TabKey } from './NavPillGroup';
import { APP_CONFIG } from '../../constants/app';

interface TopNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e5e7eb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="cal-display-headline text-lg font-bold text-[#111111] tracking-tight">
              {APP_CONFIG.name}
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-[#f5f5f5] text-[#6b7280] rounded border border-[#e5e7eb]">
              {APP_CONFIG.version}
            </span>
          </div>
        </div>

        {/* Navigation Pill Group */}
        <div className="hidden md:flex items-center">
          <NavPillGroup activeTab={activeTab} onChange={onTabChange} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <a
            href={`${APP_CONFIG.swagger_endpoint}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-xs text-[#6b7280] hover:text-[#111111] font-medium px-2 py-1 rounded-md hover:bg-[#f8f9fa] transition-colors"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Mobile Navigation Pill Group */}
      <div className="md:hidden flex justify-center py-2 border-t border-[#f3f4f6] px-4">
        <NavPillGroup activeTab={activeTab} onChange={onTabChange} />
      </div>
    </header>
  );
};
