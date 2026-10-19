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
