import WebSocket from "ws";
import NotificationTemplate from "../models/notificationTemplate";

export type NotificationTemplateKey = "invoice_created" | "invoice_due" | "cash_requested" | "payment_received" | "extension_requested";
export type NotificationTemplateValues = Record<string, string | number | undefined>;

export const defaultNotificationTemplates: Record<NotificationTemplateKey, string> = {
  invoice_created: "Halo %customer_name%,\nInvoice %invoice_number% sebesar %payment% telah dibuat.\nJatuh tempo: %due_date%.\nBuka %dashboard_link% untuk melanjutkan pembayaran.",
  invoice_due: "Halo %customer_name%,\nInvoice %invoice_number% sebesar %payment% akan jatuh tempo pada %due_date%.\nPengingat H-%days_before_due%.",
  cash_requested: "Permintaan pembayaran cash dari %customer_name%.\nInvoice: %invoice_number%\nJumlah: %payment%\nBerlaku sampai: %expires_at%.\nBuka %dashboard_link% untuk konfirmasi.",
  payment_received: "Pembayaran dari %customer_name% berhasil diterima.\nInvoice: %invoice_number%\nJumlah: %payment%\nMetode: %payment_method%.",
  extension_requested: "%customer_name% mengajukan perpanjangan sewa kamar %room_name% selama %months% bulan.\nInvoice: %invoice_number%\nJumlah: %payment%.\nBuka %dashboard_link% untuk memeriksa.",
};

export const renderNotificationTemplate = async (event: NotificationTemplateKey, values: NotificationTemplateValues): Promise<string> => {
  const template = await NotificationTemplate.findOne({ ownerId: "__global__", event, active: true }).sort({ updatedAt: -1 }).lean();
  const content = template?.content || defaultNotificationTemplates[event];
  return content.replace(/%([a-z_]+)%/g, (_match, key: string) => String(values[key] ?? ""));
};

export type NotificationEvent =
  | {
      type: "invoice_created";
      invoiceNumber: string;
      customerName: string;
      customerPhone: string;
      amount: number;
      dueDate: string;
      message?: string;
    }
  | {
      type: "invoice_due";
      invoiceNumber: string;
      customerName: string;
      customerPhone: string;
      ownerName: string;
      ownerPhone: string;
      amount: number;
      dueDate: string;
      daysBeforeDue: number;
      message?: string;
    }
  | {
      type: "cash_requested";
      invoiceNumber?: string;
      customerName: string;
      ownerName: string;
      ownerPhone: string;
      amount: number;
      expiresAt: string;
      message?: string;
    }
  | {
      type: "payment_received";
      invoiceNumber?: string;
      customerName: string;
      ownerName: string;
      ownerPhone: string;
      amount: number;
      paymentMethod: string;
      paymentDate: string;
      message?: string;
    }
  | {
      type: "extension_requested";
      customerName: string;
      customerPhone: string;
      ownerName: string;
      ownerPhone: string;
      roomName: string;
      invoiceNumber: string;
      amount: number;
      months: number;
      message?: string;
    };

const websocketUrl = process.env.NOTIFICATION_WS_URL || "ws://notification:4000";
const reconnectDelayMs = 5_000;

class NotificationBridge {
  private socket: WebSocket | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private readonly pendingEvents: NotificationEvent[] = [];
  private connecting = false;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.connecting) return;

    this.connecting = true;
    const socket = new WebSocket(websocketUrl);
    this.socket = socket;

    socket.once("open", () => {
      this.connecting = false;
      this.flush();
    });

    socket.once("close", () => {
      this.connecting = false;
      this.socket = undefined;
      this.scheduleReconnect();
    });

    socket.once("error", () => {
      socket.close();
    });
  }

  publish(event: NotificationEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
      return;
    }

    this.pendingEvents.push(event);
    this.connect();
  }

  private flush(): void {
    while (this.pendingEvents.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(this.pendingEvents.shift()));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, reconnectDelayMs);
  }
}

export const notificationBridge = new NotificationBridge();

export const publishPaymentReceived = (event: Extract<NotificationEvent, { type: "payment_received" }>): void => {
  notificationBridge.publish(event);
};

export const publishInvoiceCreated = (event: Extract<NotificationEvent, { type: "invoice_created" }>): void => {
  notificationBridge.publish(event);
};

export const publishCashRequested = (event: Extract<NotificationEvent, { type: "cash_requested" }>): void => {
  notificationBridge.publish(event);
};

export const publishExtensionRequested = (event: Extract<NotificationEvent, { type: "extension_requested" }>): void => {
  notificationBridge.publish(event);
};
