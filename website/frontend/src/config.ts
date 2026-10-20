const requiredUrl = (value: string | undefined, fallback: string, name: string) => {
  if (value) {
    return value;
  }

  if (import.meta.env.DEV) {
    return fallback;
  }

  throw new Error(`${name} is not configured`);
};

export const API_URL = requiredUrl(
  import.meta.env.VITE_API_URL,
  "/api/v1",
  "VITE_API_URL",
);

export const NOTIFICATION_URL = requiredUrl(
  import.meta.env.VITE_NOTIFICATION_URL,
  "/notification",
  "VITE_NOTIFICATION_URL",
);

export const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return token ? { authorization: `Bearer ${token}` } : {};
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init);
  if (response.status === 401) {
    ["authToken", "userId", "username", "userRole", "firstname", "lastname", "email"].forEach((key) => localStorage.removeItem(key));
    if (window.location.pathname !== "/login") window.location.replace("/login");
  }
  return response;
};
