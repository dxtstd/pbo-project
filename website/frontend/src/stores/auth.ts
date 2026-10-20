import { create } from "zustand";

export type UserRole = "admin" | "owner" | "customer";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  firstname?: string;
  lastname?: string;
  email?: string;
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
  const firstname = localStorage.getItem("firstname") || undefined;
  const lastname = localStorage.getItem("lastname") || undefined;
  const email = localStorage.getItem("email") || undefined;
  return id && role ? { id, username, role, firstname, lastname, email } : null;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("authToken"),
  user: readUser(),
  login: (token, user) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("username", user.username);
    localStorage.setItem("userRole", user.role);
    if (user.firstname) localStorage.setItem("firstname", user.firstname);
    if (user.lastname) localStorage.setItem("lastname", user.lastname);
    if (user.email) localStorage.setItem("email", user.email);
    set({ token, user });
  },
  logout: () => {
    ["authToken", "userId", "username", "userRole", "firstname", "lastname", "email"].forEach((key) => localStorage.removeItem(key));
    set({ token: null, user: null });
  },
}));
