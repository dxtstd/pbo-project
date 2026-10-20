import WebSocket from "ws";
import NotificationTemplate from "../models/notificationTemplate";
import SiteContent from "../models/siteContent";
import Owner from "../models/owner";
import { config } from "../config/env";
import logger from "../utils/logger";

export type NotificationTemplateKey = "invoice_created" | "invoice_due" | "cash_requested" | "payment_received" | "extension_requested";
export type NotificationAudience = "owner" | "customer";
export type NotificationCategory = NotificationTemplateKey;
export type NotificationTemplateValues = Record<string, string | number | undefined>;

export const defaultNotificationTemplates: Record<NotificationAudience, Record<NotificationTemplateKey, { header: string; content: string }>> = {
  customer: {
    invoice_created: { header: "INVOICE BARU", content: "Halo %customer_name%,\nInvoice %invoice_number% sebesar %payment% telah dibuat.\nJatuh tempo: %due_date%.\nBuka %dashboard_link% untuk melanjutkan pembayaran." },
    invoice_due: { header: "PENGINGAT TAGIHAN", content: "Halo %customer_name%,\nInvoice %invoice_number% sebesar %payment% akan jatuh tempo pada %due_date%.\nPengingat H-%days_before_due%." },
    cash_requested: { header: "", content: "" },
    payment_received: { header: "PEMBAYARAN BERHASIL", content: "Pembayaran invoice %invoice_number% sebesar %payment% telah berhasil diterima.\nMetode pembayaran: %payment_method%." },
    extension_requested: { header: "", content: "" },
  },
  owner: {
    invoice_created: { header: "", content: "" },
    invoice_due: { header: "", content: "" },
    cash_requested: { header: "REQUEST PEMBAYARAN CASH", content: "Permintaan pembayaran cash dari %customer_name%.\nInvoice: %invoice_number%\nJumlah: %payment%\nBerlaku sampai: %expires_at%.\nBuka %dashboard_link% untuk konfirmasi." },
    payment_received: { header: "TRANSAKSI BERHASIL", content: "Pembayaran dari %customer_name% berhasil diterima.\nInvoice: %invoice_number%\nJumlah: %payment%\nMetode: %payment_method%." },
    extension_requested: { header: "REQUEST PERPANJANGAN KAMAR", content: "%customer_name% mengajukan perpanjangan sewa kamar %room_name% selama %months% bulan.\nInvoice: %invoice_number%\nJumlah: %payment%.\nBuka %dashboard_link% untuk memeriksa." },
  },
};

const defaultAudienceForEvent: Record<NotificationTemplateKey, NotificationAudience> = {
  invoice_created: "customer", invoice_due: "customer", cash_requested: "owner", payment_received: "owner", extension_requested: "owner",
};

export const renderNotificationTemplate = async (event: NotificationTemplateKey, values: NotificationTemplateValues, audience = defaultAudienceForEvent[event]): Promise<string> => {
  const fallback = defaultNotificationTemplates[audience][event];
  const template = await NotificationTemplate.findOne({ ownerId: "__global__", audience, event, active: true }).sort({ updatedAt: -1 }).lean();
  const content = template?.content || fallback.content;
  const header = template?.header || fallback.header;
  const business = await SiteContent.findOne({ key: "landing" }).select("siteName").lean();
  const renderedHeader = header.replace(/%([a-z_]+)%/g, (_match, key: string) => String(values[key] ?? (key === "name_business" ? business?.siteName : "")));
  const rendered = content.replace(/%([a-z_]+)%/g, (_match, key: string) => String(values[key] ?? (key === "name_business" ? business?.siteName : "")));
  return `${values.name_business || business?.siteName || "Kost Lorem Ipsum"}\n=============\n${renderedHeader}\n\n${rendered}`;
};

export const isNotificationCategoryEnabled = async (ownerId: string | undefined, category: NotificationCategory): Promise<boolean> => {
  if (!ownerId) return false;
  const owner = await Owner.findOne({ ownerId }).select("notificationPreferences").lean();
  return owner?.notificationPreferences?.[category] !== false;
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
      recipientPhone?: string;
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
      recipientPhone?: string;
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
      logger.info({ websocketUrl }, "Notification bridge connected");
      this.flush();
    });

    socket.once("close", () => {
      this.connecting = false;
      this.socket = undefined;
      logger.warn({ websocketUrl }, "Notification bridge disconnected");
      this.scheduleReconnect();
    });

    socket.once("error", () => {
      logger.error({ websocketUrl }, "Notification bridge connection error");
      socket.close();
    });
  }

  publish(event: NotificationEvent): void {
    logger.info({
      eventType: event.type,
      invoiceNumber: "invoiceNumber" in event ? event.invoiceNumber : undefined,
      recipient: "recipientPhone" in event ? event.recipientPhone : ("customerPhone" in event ? event.customerPhone : event.ownerPhone),
      queued: this.socket?.readyState !== WebSocket.OPEN,
    }, "Notification event published");
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event), (error) => {
        if (error) {
          logger.error({ err: error, eventType: event.type }, "Failed to send notification over WebSocket");
          this.pendingEvents.push(event);
          this.connect();
        }
      });
      return;
    }

    void fetch(`${config.notificationHttpUrl}/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    }).then((response) => {
      if (!response.ok) throw new Error(`Notification service returned ${response.status}`);
    }).catch((error: unknown) => {
      logger.error({ err: error, eventType: event.type }, "Failed to send notification over HTTP");
      this.pendingEvents.push(event);
      this.connect();
    });
  }

  private flush(): void {
    if (this.pendingEvents.length > 0) {
      logger.info({ count: this.pendingEvents.length }, "Flushing queued notification events");
    }
    while (this.pendingEvents.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const event = this.pendingEvents.shift();
      if (event) this.socket.send(JSON.stringify(event));
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
