import { create } from "zustand";

export interface SelectedRoom {
  roomId: string;
  name: string;
  price: number;
}

export interface SelectedCustomer {
  customerId: string;
  firstname: string;
  lastname: string;
}

interface KostState {
  selectedRoom: SelectedRoom | null;
  selectedCustomer: SelectedCustomer | null;
  selectRoom: (room: SelectedRoom | null) => void;
  selectCustomer: (customer: SelectedCustomer | null) => void;
  clearSelection: () => void;
}

export const useKostStore = create<KostState>((set) => ({
  selectedRoom: null,
  selectedCustomer: null,
  selectRoom: (selectedRoom) => set({ selectedRoom }),
  selectCustomer: (selectedCustomer) => set({ selectedCustomer }),
  clearSelection: () => set({ selectedRoom: null, selectedCustomer: null }),
}));
