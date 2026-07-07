/**
 * API Client for ProjectHub Backend
 * Base URL configuration and axios instance
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Token management
const TOKEN_KEY = "projecthub_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
};

// Fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle empty responses (204 No Content or empty body)
  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text);
}

// File upload wrapper
async function apiUpload<T>(
  endpoint: string,
  file: File,
): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text);
}

export const api = {
  // GET request
  get: <T>(endpoint: string): Promise<T> => {
    return apiFetch<T>(endpoint, { method: "GET" });
  },

  // POST request
  post: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiFetch<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // PATCH request
  patch: <T>(endpoint: string, data?: any): Promise<T> => {
    return apiFetch<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // DELETE request
  delete: <T>(endpoint: string): Promise<T> => {
    return apiFetch<T>(endpoint, { method: "DELETE" });
  },

  // File upload
  upload: <T>(endpoint: string, file: File): Promise<T> => {
    return apiUpload<T>(endpoint, file);
  },
};
