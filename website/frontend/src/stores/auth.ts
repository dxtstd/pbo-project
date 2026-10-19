import { create } from "zustand";

export type UserRole = "admin" | "owner" | "customer";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const readUser = (): AuthUser | null => {
  const id = localStorage.getItem("userId");
  const username = localStorage.getItem("username") || "";
  const role = localStorage.getItem("userRole") as UserRole | null;
  return id && role ? { id, username, role } : null;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("authToken"),
  user: readUser(),
  login: (token, user) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("username", user.username);
    localStorage.setItem("userRole", user.role);
    set({ token, user });
  },
  logout: () => {
    ["authToken", "userId", "username", "userRole"].forEach((key) => localStorage.removeItem(key));
    set({ token: null, user: null });
  },
}));
