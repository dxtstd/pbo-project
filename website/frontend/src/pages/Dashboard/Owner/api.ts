import { API_URL, authHeaders } from "../../../config";
import type { OwnerData } from "./types";

export const loadOwnerDashboard = async (ownerId: string): Promise<OwnerData> => {
  const response = await fetch(`${API_URL}/dashboard/owner/${ownerId}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Dashboard owner tidak dapat dimuat");
  return response.json() as Promise<OwnerData>;
};

export const createRoom = async (ownerId: string, payload: { name: string; type: string; price: number; withFurniture: boolean }) => {
  const response = await fetch(`${API_URL}/dashboard/owner/${ownerId}/rooms`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message || "Kamar gagal ditambahkan");
  }
};

export const updateRoom = async (ownerId: string, roomId: string, payload: { name: string; type: string; price: number; withFurniture: boolean }) => {
  const response = await fetch(`${API_URL}/dashboard/owner/${ownerId}/rooms/${roomId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message || "Kamar gagal diperbarui");
  }
};

export const assignRoomCustomer = async (ownerId: string, roomId: string, customerId: string | null) => {
  const response = await fetch(`${API_URL}/dashboard/owner/${ownerId}/rooms/${roomId}/customer`, {
    method: "PATCH",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message || "Penghuni kamar gagal diperbarui");
  }
};

export type CustomerPayload = {
  customerId: string;
  username: string;
  firstname: string;
  lastname: string;
  phoneNumber: string;
  password?: string;
};

const customerRequest = async (url: string, method: string, payload?: CustomerPayload) => {
  const response = await fetch(url, {
    method,
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message || "Customer gagal diproses");
  }
};

export const createCustomer = (ownerId: string, payload: CustomerPayload) =>
  customerRequest(`${API_URL}/dashboard/owner/${ownerId}/customers`, "POST", payload);

export const updateCustomer = (ownerId: string, customerId: string, payload: CustomerPayload) =>
  customerRequest(`${API_URL}/dashboard/owner/${ownerId}/customers/${customerId}`, "PATCH", payload);

export const deleteCustomer = (ownerId: string, customerId: string) =>
  customerRequest(`${API_URL}/dashboard/owner/${ownerId}/customers/${customerId}`, "DELETE");

export const confirmCash = async (transactionId: string) => {
  const response = await fetch(`${API_URL}/payment/cash/${transactionId}/confirm`, { method: "POST", headers: authHeaders() });
  if (!response.ok) throw new Error("Pembayaran cash gagal dikonfirmasi");
};
