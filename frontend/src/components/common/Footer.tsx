import React from 'react';
import { Calendar, ShieldCheck, Zap } from 'lucide-react';
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

          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-3">
              End-Points Covered
            </h4>
            <ul className="space-y-2 text-xs font-mono text-[#a1a1aa]">
              <li>POST /reset</li>
              <li>GET /slots</li>
              <li>POST /bookings</li>
              <li>GET /bookings</li>
              <li>GET /bookings/:id</li>
              <li>DELETE /bookings/:id</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-3">
              Contract Specs
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                <span>X-API-Key (Level 2)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                <span>SELECT FOR UPDATE locks (Level 3)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-[#fb923c]" />
                <span>Idempotency-Key deduplication (Level 4)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ec4899]" />
                <span>{APP_CONFIG.rateLimit.maxAttemptsPerMinute} req/min rate limiter (Level 5)</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-3">
              Style Specifications
            </h4>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Crafted from <code className="text-white">DESIGN-cal.md</code> tokens: geometric display headlines, pill navigation, 8px/12px border radii, and signature Cal.com monochromatic canvas.
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
