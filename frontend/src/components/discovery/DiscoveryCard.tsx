import React from 'react';
import { RelevanceBadge } from '../discovery/RelevanceBadge';

export type EntityType = 'problem' | 'organization' | 'project' | 'need' | 'offer';

interface DiscoveryCardProps {
  type: EntityType;
  title: string;
  subtitle?: string;
  description?: string;
  relevanceReasons: string[];
  onClick?: () => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  type,
  title,
  subtitle,
  description,
  relevanceReasons,
  onClick,
}) => (
  <div className="discovery-card p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer bg-white" onClick={onClick}>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {subtitle && <p className="text-sm text-gray-600 mb-2">{subtitle}</p>}
    {description && <p className="text-sm text-gray-700 mb-3 line-clamp-3">{description}</p>}
    <div className="flex flex-wrap gap-2">
      {relevanceReasons.map((r, i) => (
        <RelevanceBadge key={i} label={r} />
      ))}
    </div>
  </div>
);
