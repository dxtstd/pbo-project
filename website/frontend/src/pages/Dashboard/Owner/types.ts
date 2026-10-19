export type Room = {
  roomId: string;
  name: string;
  type: string;
  price: number;
  withFurniture: boolean;
  customerId?: string;
  isOccupied: boolean;
};

export type OwnerData = {
  owner?: { firstname: string; lastname: string; email: string };
  rooms: Room[];
  customers: { customerId: string; firstname: string; lastname: string }[];
  invoices: { invoiceNumber: string; customerId: string; roomId: string; amount: number; status: string; dueDate: string }[];
  cashPayments?: { transactionId: string; totalAmount: number; invoiceNumber?: string }[];
  transactions: {
    transactionId: string;
    customerId: string;
    roomId: string;
    invoiceNumber?: string;
    paymentMethod: string;
    paymentDate: string;
    totalAmount: number;
    status: string;
  }[];
};
