import React from 'react';

interface RelevanceBadgeProps {
  label: string;
}

export const RelevanceBadge: React.FC<RelevanceBadgeProps> = ({ label }) => {
  return (
    <span className="relevance-badge inline-block bg-emerald-100 text-emerald-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
      {label}
    </span>
  );
};
