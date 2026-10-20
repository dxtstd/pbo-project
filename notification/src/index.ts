import { createServer } from "node:http";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import env from "dotenv";
import { WebSocketServer } from "ws";
import pino from "pino";
import pretty from "pino-pretty";
import { ConsoleLogger, createStore, WaClient } from "zapo-js";
import { createSqliteStore } from "@zapo-js/store-sqlite";

const environment = process.env.NODE_ENV || "development";
env.config({ path: `.env.${environment}` });
env.config();

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pretty({
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
  }),
);

const port = Number(process.env.PORT) || 4000;
const authSessionId = process.env.ZAPO_SESSION_ID || "kost-notification";
const zapoStorePath = process.env.ZAPO_STORE_PATH || ".auth/state.sqlite";

mkdirSync(dirname(zapoStorePath), { recursive: true });

const store = createStore({
  backends: {
    sqlite: createSqliteStore({ path: zapoStorePath }),
  },
  providers: {
    auth: "sqlite",
    signal: "sqlite",
    preKey: "sqlite",
    session: "sqlite",
    identity: "sqlite",
    senderKey: "sqlite",
    appState: "sqlite",
    privacyToken: "sqlite",
    messages: "none",
    threads: "sqlite",
    contacts: "sqlite",
  },
});
let latestQr: string | undefined;
let pairedNumber: string | undefined;
let connectionStatus = "disconnected";
let reconnectEnabled = true;
let zapo: WaClient;

const createClient = (): WaClient => {
  logger.info({ sessionId: authSessionId }, "Creating WhatsApp client");
  const client = new WaClient({ store, sessionId: authSessionId }, new ConsoleLogger(
    process.env.LOG_LEVEL === "debug" ? "debug" : "info",
  ));
  client.on("auth_qr", ({ qr }) => {
    latestQr = qr;
    connectionStatus = "pairing";
    logger.info({ qrLength: qr.length, status: connectionStatus }, "WhatsApp pairing QR generated");
  });

  client.on("auth_paired", ({ credentials }) => {
    latestQr = undefined;
    pairedNumber = credentials.meJid;
    connectionStatus = "open";
    logger.info({ pairedNumber: credentials.meJid, status: connectionStatus }, "WhatsApp paired");
  });

  client.on("connection", ({ status }) => {
    connectionStatus = status;
    if (status === "open") latestQr = undefined;
    logger.info({ status, reconnectEnabled }, "WhatsApp connection status changed");
    if (status === "close" && reconnectEnabled) {
      setTimeout(() => void zapo.connect(), 5_000);
    }
  });
  return client;
};

zapo = createClient();

/**
 * Converts a user-supplied phone number into a WhatsApp JID.
 *
 * @param phone Phone number containing optional punctuation or country prefix.
 * @returns WhatsApp JID in the form `<digits>@s.whatsapp.net`.
 */
const normalizePhone = (phone: string): string => {
  const rawDigits = phone.replace(/\D/g, "");
  const digits = rawDigits.startsWith("0") ? `62${rawDigits.slice(1)}` : rawDigits;
  return `${digits}@s.whatsapp.net`;
};

const redactPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `${digits.slice(0, 4)}***${digits.slice(-3)}` : "***";
};

/**
 * Converts a WebSocket notification event into a WhatsApp message.
 *
 * @param event Notification event payload received from the backend bridge.
 * @returns Promise resolved after the message is sent.
 * @throws Error when the event has no recipient or WhatsApp delivery fails.
 */
const sendEvent = async (event: Record<string, unknown>): Promise<void> => {
  if (!["invoice_created", "invoice_due", "cash_requested", "payment_received", "extension_requested"].includes(String(event.type))) return;

  const recipientValue = event.recipientPhone || (["invoice_created", "invoice_due"].includes(String(event.type)) ? event.customerPhone : event.ownerPhone);
  const recipient = typeof recipientValue === "string" ? recipientValue.trim() : "";
  if (!recipient) throw new Error("Notification event has no recipient phone number");
  const recipientJid = normalizePhone(recipient);

  const message = typeof event.message === "string" && event.message
    ? event.message
    : event.type === "invoice_created"
    ? [
        `Halo ${event.customerName},`,
        `invoice ${event.invoiceNumber} sebesar Rp${event.amount} telah dibuat.`,
        `Jatuh tempo pada ${event.dueDate}. Silakan buka dashboard untuk memilih metode pembayaran.`,
      ].join("\n")
    : event.type === "invoice_due"
    ? [
        `Halo ${event.customerName},`,
        `tagihan ${event.invoiceNumber} sebesar Rp${event.amount} akan jatuh tempo pada ${event.dueDate}.`,
        `Ini adalah pengingat H-${event.daysBeforeDue}.`,
      ].join("\n")
    : event.type === "cash_requested"
    ? [
        `Permintaan pembayaran cash dari ${event.customerName}.`,
        `Invoice: ${event.invoiceNumber || "-"}`,
        `Jumlah: Rp${event.amount}`,
        `Berlaku sampai: ${event.expiresAt}`,
        "Silakan buka dashboard owner untuk mengonfirmasi atau menolak.",
      ].join("\n")
    : event.type === "extension_requested"
    ? `Permintaan perpanjangan sewa dari ${event.customerName}.`
    : [
        `Pembayaran diterima dari ${event.customerName}.`,
        `Invoice: ${event.invoiceNumber || "-"}`,
        `Jumlah: Rp${event.amount}`,
        `Metode: ${event.paymentMethod}`,
      ].join("\n");

  logger.info({
    deliveryId: event.deliveryId,
    eventType: event.type,
    invoiceNumber: event.invoiceNumber,
    recipient: redactPhone(recipient),
    recipientJid: redactPhone(recipientJid),
    connectionStatus,
    zapoState: zapo.getState(),
    pairedNumber: pairedNumber ? redactPhone(pairedNumber) : undefined,
    messageLength: message.length,
  }, "Sending automatic WhatsApp notification");
  try {
    await zapo.message.send(recipientJid, message);
  } catch (error) {
    logger.error({
      err: error,
      deliveryId: event.deliveryId,
      eventType: event.type,
      recipient: redactPhone(recipient),
      recipientJid: redactPhone(recipientJid),
      connectionStatus,
      zapoState: zapo.getState(),
    }, "Automatic WhatsApp notification send failed");
    throw error;
  }
  logger.info({
    deliveryId: event.deliveryId,
    eventType: event.type,
    recipient: redactPhone(recipient),
    recipientJid: redactPhone(recipientJid),
    connectionStatus,
  }, "Automatic WhatsApp notification sent");
};

/**
 * Sends a manually requested notification test message.
 *
 * @param body JSON request body containing `recipient` and `message`.
 * @returns Promise resolved after the test message is sent.
 * @throws Error when the payload is invalid or WhatsApp is disconnected.
 */
const sendTestMessage = async (body: string): Promise<void> => {
  const payload = JSON.parse(body) as { recipient?: string; message?: string };
  if (!payload.recipient?.trim() || !payload.message?.trim()) throw new Error("Test notification requires recipient and message");
  if (connectionStatus !== "open") throw new Error("WhatsApp is not connected");
  logger.info({ recipient: redactPhone(payload.recipient), messageLength: payload.message.length }, "Sending test WhatsApp notification");
  await zapo.message.send(normalizePhone(payload.recipient), payload.message);
  logger.info({ recipient: redactPhone(payload.recipient) }, "Test WhatsApp notification sent");
};

const server = createServer((request, response) => {
  const startedAt = process.hrtime.bigint();
  response.on("finish", () => {
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
    }, "Notification HTTP request completed");
  });
  if (request.url === "/event" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => { body += chunk.toString(); });
    request.on("end", () => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(body) as Record<string, unknown>;
      } catch {
        logger.warn({ endpoint: "/event" }, "Rejected invalid notification event JSON");
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "Invalid notification event JSON" }));
        return;
      }
      logger.info({
        deliveryId: event.deliveryId,
        eventType: event.type,
        invoiceNumber: event.invoiceNumber,
        recipient: redactPhone(String(event.recipientPhone || event.customerPhone || event.ownerPhone || "")),
      }, "HTTP notification event received");
      void sendEvent(event)
        .then(() => {
          logger.info({ deliveryId: event.deliveryId, eventType: event.type }, "HTTP notification event acknowledged after WhatsApp send");
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ sent: true }));
        })
        .catch((error: unknown) => {
          logger.error({ err: error, deliveryId: event.deliveryId, eventType: event.type, endpoint: "/event" }, "Failed to deliver HTTP notification event");
          response.writeHead(503, { "content-type": "application/json" });
          response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Notification event failed" }));
        });
    });
    return;
  }
  if (request.url === "/test" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => { body += chunk.toString(); });
    request.on("end", () => {
      void sendTestMessage(body)
        .then(() => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ sent: true }));
        })
        .catch((error: unknown) => {
          response.writeHead(503, { "content-type": "application/json" });
          response.end(JSON.stringify({ message: error instanceof Error ? error.message : "Test notification failed" }));
        });
    });
    return;
  }
  if (request.url === "/status") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: connectionStatus, qr: latestQr, pairedNumber }));
    return;
  }
  if (request.url === "/pair" && request.method === "POST") {
    logger.info("WhatsApp pairing requested");
    reconnectEnabled = false;
    void zapo.logout()
      .catch((error: unknown) => logger.error({ err: error }, "Failed to clear WhatsApp session before pairing"))
      .finally(() => {
        latestQr = undefined;
        pairedNumber = undefined;
        connectionStatus = "disconnected";
        reconnectEnabled = true;
        zapo = createClient();
        void zapo.connect();
      });
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "pairing" }));
    return;
  }
  if (request.url === "/disconnect" && request.method === "POST") {
    logger.info("WhatsApp disconnect requested");
    reconnectEnabled = false;
    void zapo.disconnect()
      .then(() => {
        connectionStatus = "disconnected";
      })
      .catch((error: unknown) => logger.error({ err: error }, "Failed to disconnect WhatsApp"));
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "disconnecting" }));
    return;
  }
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", whatsapp: zapo.getState() }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: 404, message: "Not Found" }));
});

const websocket = new WebSocketServer({ server });
websocket.on("connection", (socket) => {
  logger.info("Backend notification WebSocket connected");
  socket.on("message", async (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      logger.info({ eventType: event.type }, "WebSocket notification event received");
      await sendEvent(event);
    } catch (error) {
      logger.error({ err: error }, "Failed to process WebSocket notification event");
    }
  });
  socket.on("close", () => logger.info("Backend notification WebSocket disconnected"));
  socket.on("error", (error) => logger.error({ err: error }, "Backend notification WebSocket error"));
});

server.listen(port, "0.0.0.0", () => {
  logger.info({ port, storePath: zapoStorePath, sessionId: authSessionId }, "Notification service started");
  void zapo.connect();
});
