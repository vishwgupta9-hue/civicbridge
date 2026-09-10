import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { NavigationBar } from '../components/layout/NavigationBar';
import { DiscoveryCard } from '../components/discovery/DiscoveryCard';
import { useApi } from '../hooks/useApi';

export const ProblemSolversPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth() ?? {};

  const { data: orgs, loading: orgLoading, error: orgError } = useApi<any[]>(
    token ? `${API_BASE_URL}/organizations?problemId=${id}` : ''
  );
  const { data: projects, loading: projLoading, error: projError } = useApi<any[]>(
    token ? `${API_BASE_URL}/projects?problemId=${id}` : ''
  );

  const isLoading = orgLoading || projLoading;
  const error = orgError || projError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationBar activeSection="problems" />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Solvers for this Problem</h1>
        {isLoading && (
          <div className="text-center py-8">
            <span className="text-slate-500">Loading solvers...</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded">
            <span className="text-rose-700">{error}</span>
          </div>
        )}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs?.map(org => (
              <DiscoveryCard
                key={org.id}
                title={org.name}
                subtitle={org.type}
                description={org.description}
                link={`/organizations/${org.id}`}
                label="Explore Capabilities"
              />
            ))}
            {projects?.map(proj => (
              <DiscoveryCard
                key={proj.id}
                title={proj.title}
                subtitle={proj.trackType?.replace(/_/g, ' ')}
                description={proj.executiveSummary}
                link={`/projects/${proj.id}`}
                label="Find Partners"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProblemSolversPage;
