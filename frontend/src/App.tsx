import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, getDashboardPath } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ReportProblemPage } from "./pages/ReportProblemPage";
import { ProblemBankPage } from "./pages/ProblemBankPage";
import { ProblemDetailsPage } from "./pages/ProblemDetailsPage";
import { ProjectDetailsPage } from "./pages/ProjectDetailsPage";
import { ResourceExchangePage } from "./pages/ResourceExchangePage";
import { CollaborationDetailsPage } from "./pages/CollaborationDetailsPage";
import { PilotDetailsPage } from "./pages/PilotDetailsPage";
import { CitizenDashboard } from "./pages/dashboards/CitizenDashboard";
import { AdminDashboard } from "./pages/dashboards/AdminDashboard";
import { UniversityDashboard } from "./pages/dashboards/UniversityDashboard";
import { IndustryDashboard } from "./pages/dashboards/IndustryDashboard";
import { StartupDashboard } from "./pages/dashboards/StartupDashboard";

// Root redirect handler based on authenticated user session
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-medium">Loading CivicBridge...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Route: Auto-redirects based on role or login state */}
          <Route path="/" element={<RootRedirect />} />

          {/* Citizen Problem Reporting */}
          <Route
            path="/citizen/report"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN"]}>
                <ReportProblemPage />
              </ProtectedRoute>
            }
          />

          {/* Statewide Problem Bank & Problem Details (All 5 Authenticated Roles) */}
          <Route
            path="/problems"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <ProblemBankPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/problems/:id"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <ProblemDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* V3 Solution Project Dossier */}
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <ProjectDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* V3 Resource Exchange (Needs & Offers) */}
          <Route
            path="/exchange"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <ResourceExchangePage />
              </ProtectedRoute>
            }
          />

          {/* V3 Institutional Collaboration */}
          <Route
            path="/collaborations/:id"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <CollaborationDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* V3 Field Pilot Execution & Measured Outcome */}
          <Route
            path="/pilots/:id"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN", "ADMIN", "UNIVERSITY", "INDUSTRY", "STARTUP"]}>
                <PilotDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Role-Specific Dashboards */}
          <Route
            path="/dashboard/citizen"
            element={
              <ProtectedRoute allowedRoles={["CITIZEN"]}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/university"
            element={
              <ProtectedRoute allowedRoles={["UNIVERSITY"]}>
                <UniversityDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/industry"
            element={
              <ProtectedRoute allowedRoles={["INDUSTRY"]}>
                <IndustryDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/startup"
            element={
              <ProtectedRoute allowedRoles={["STARTUP"]}>
                <StartupDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
