import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string): ApiResult<T> {
  const { token } = useAuth() ?? {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`API error ${response.status}: ${err}`);
        }
        const json = await response.json();
        setData(json);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [url, token]);

  return { data, loading, error };
}
