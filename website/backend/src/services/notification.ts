import WebSocket from "ws";

export type NotificationEvent =
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
