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

export const confirmCash = async (transactionId: string) => {
  const response = await fetch(`${API_URL}/payment/cash/${transactionId}/confirm`, { method: "POST", headers: authHeaders() });
  if (!response.ok) throw new Error("Pembayaran cash gagal dikonfirmasi");
};
