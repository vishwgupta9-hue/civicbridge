import React from 'react';
import { Link } from 'react-router-dom';
import { RelevanceBadge } from '../discovery/RelevanceBadge';

export type EntityType = 'problem' | 'organization' | 'project' | 'need' | 'offer';

interface DiscoveryCardProps {
  type: EntityType;
  title: string;
  subtitle?: string;
  description?: string;
  relevanceReasons?: string[];
  onClick?: () => void;
  link?: string;
  label?: string;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  type,
  title,
  subtitle,
  description,
  relevanceReasons = [],
  onClick,
  link,
  label,
}) => (
  <div
    className="discovery-card p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer bg-white"
    onClick={onClick}
    data-type={type}
  >
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {subtitle && <p className="text-sm text-gray-600 mb-2">{subtitle}</p>}
    {description && <p className="text-sm text-gray-700 mb-3 line-clamp-3">{description}</p>}
    {relevanceReasons && relevanceReasons.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-2">
        {relevanceReasons.map((r, i) => (
          <RelevanceBadge key={i} label={r} />
        ))}
      </div>
    )}
    {link && label && (
      <Link to={link} className="inline-block mt-2 text-sm font-semibold text-emerald-600 hover:underline">
        {label}
      </Link>
    )}
  </div>
);
