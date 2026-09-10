import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { NavigationBar } from '../components/layout/NavigationBar';
import { DiscoveryCard } from '../components/discovery/DiscoveryCard';
import { useApi } from '../hooks/useApi';

export const ProblemSolversPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  // Fetch problem details to derive organization relevance filters
  const {
    data: problem,
    loading: problemLoading,
    error: problemError,
  } = useApi<any>(token ? `${API_BASE_URL}/problems/${id}` : '');

  // Build organization discovery query based on problem attributes (district and title)
  const orgQuery = problem
    ? `${API_BASE_URL}/discovery/organizations?district=${encodeURIComponent(problem.district)}&search=${encodeURIComponent(problem.title)}`
    : '';

  const {
    data: orgs,
    loading: orgLoading,
    error: orgError,
  } = useApi<any[]>(token && orgQuery ? orgQuery : '');

  const {
    data: projects,
    loading: projLoading,
    error: projError,
  } = useApi<any[]>(token ? `${API_BASE_URL}/projects?problemId=${id}` : '');

  const isLoading = problemLoading || orgLoading || projLoading;
  const error = problemError || orgError || projError;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      {isLoading && <div className="p-4">Loading...</div>}
      {error && <div className="p-4 text-red-600">Error loading data</div>}
      <div className="p-4 grid gap-4 md:grid-cols-2">
        {orgs?.map((org) => (
          <DiscoveryCard
            key={org.id}
            type="organization"
            title={org.name}
            description={org.description}
          />
        ))}
        {projects?.map((project) => (
          <DiscoveryCard
            key={project.id}
            type="project"
            title={project.name}
            description={project.description}
          />
        ))}
      </div>
    </div>
  );
};

export default ProblemSolversPage;
