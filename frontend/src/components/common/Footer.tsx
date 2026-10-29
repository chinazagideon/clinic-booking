import React from 'react';
import { Calendar } from 'lucide-react';
import { APP_CONFIG } from '../../constants/app';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#101010] text-[#a1a1aa] mt-20 border-t border-[#1a1a1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <div className="w-6 h-6 rounded-full bg-white text-[#101010] flex items-center justify-center font-bold text-xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="cal-display-headline text-base font-semibold text-white tracking-tight">
                {APP_CONFIG.name}
              </span>
            </div>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              {APP_CONFIG.tagline}
            </p>
          </div>


        </div>

        <div className="mt-10 pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6b7280]">
          <p>{APP_CONFIG.copyrightNotice}</p>
          <p className="mt-2 sm:mt-0 font-mono">{APP_CONFIG.stackDescription}</p>
        </div>
      </div>
    </footer>
  );
};
