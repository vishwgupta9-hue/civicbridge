import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "../types/index";
import { API_BASE_URL } from "../config/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: Role }>;
  logout: () => void;
  getDashboardPath: (role: Role) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "civicbridge_auth_token";
const API_URL = API_BASE_URL;

export function getDashboardPath(role: Role): string {
  switch (role) {
    case "CITIZEN":
      return "/dashboard/citizen";
    case "ADMIN":
      return "/dashboard/admin";
    case "UNIVERSITY":
      return "/dashboard/university";
    case "INDUSTRY":
      return "/dashboard/industry";
    case "STARTUP":
      return "/dashboard/startup";
    default:
      return "/login";
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to verify authentication session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errMsg = data.error || "Authentication failed. Please check your credentials.";
        setError(errMsg);
        setIsLoading(false);
        return { success: false, error: errMsg };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setIsLoading(false);

      return { success: true, role: data.user.role as Role };
    } catch (err: any) {
      const errMsg = "Unable to connect to CivicBridge authentication service. Please ensure the backend is running.";
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        logout,
        getDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
