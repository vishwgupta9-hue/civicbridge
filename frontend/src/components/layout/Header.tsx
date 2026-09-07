import React, { useState } from "react";
import { ResponsiveContainer } from "./ResponsiveContainer.js";
import { Menu, X, ShieldCheck, Sparkles } from "lucide-react";

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <ResponsiveContainer>
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              CB
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-neutral-900 block leading-tight">
                CivicBridge
              </span>
              <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block">
                Jharkhand • SIH PS 26043
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-700">
            <a href="#about" className="hover:text-primary-600 transition-colors py-2">
              How It Works
            </a>
            <a href="#roles" className="hover:text-primary-600 transition-colors py-2">
              Stakeholders
            </a>
            <a href="#framework" className="hover:text-primary-600 transition-colors py-2">
              Parallel Trust Model
            </a>
            <div className="flex items-center gap-2 pl-4 border-l border-neutral-200">
              <span className="badge-trust-verified">
                <ShieldCheck className="w-3.5 h-3.5" /> Govt-Verified
              </span>
              <span className="badge-trust-screened">
                <Sparkles className="w-3.5 h-3.5" /> AI-Screened
              </span>
            </div>
          </nav>

          {/* Mobile Hamburger Toggle (Guaranteed 44px touch target) */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100 space-y-2 bg-white">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50 hover:text-primary-600"
            >
              How It Works
            </a>
            <a
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50 hover:text-primary-600"
            >
              Stakeholders
            </a>
            <a
              href="#framework"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-50 hover:text-primary-600"
            >
              Parallel Trust Model
            </a>
            <div className="pt-2 px-3 flex flex-wrap gap-2">
              <span className="badge-trust-verified">
                <ShieldCheck className="w-3.5 h-3.5" /> Govt-Verified
              </span>
              <span className="badge-trust-screened">
                <Sparkles className="w-3.5 h-3.5" /> AI-Screened
              </span>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </header>
  );
};
