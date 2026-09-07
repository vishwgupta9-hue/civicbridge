import React from "react";
import { ResponsiveContainer } from "./ResponsiveContainer.js";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-neutral-200 py-8 mt-auto">
      <ResponsiveContainer>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="font-semibold text-neutral-900 text-sm">
              CivicBridge Jharkhand
            </span>
            <p className="text-xs text-neutral-500 mt-0.5">
              Smart India Hackathon • Problem Statement PS 26043
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            Parallel Trust Architecture • Zero Verification Gates • Mobile-First
          </div>
        </div>
      </ResponsiveContainer>
    </footer>
  );
};
