export type InvoiceDownloadData = {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: string;
  customerName?: string;
  roomName?: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[character] || character));

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export const downloadInvoice = (invoice: InvoiceDownloadData): void => {
  const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
<style>
body{font-family:Arial,sans-serif;color:#3e2f28;margin:0;padding:40px;background:#f7eee8}
.invoice{max-width:720px;margin:auto;background:#fffaf5;padding:40px;border:1px solid #dcc2b3;border-radius:16px}
h1{margin:0 0 8px;color:#694536} .muted{color:#765e52}
.row{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #ead0c2;padding:14px 0}
.total{font-size:22px;font-weight:bold;border:0} .status{text-transform:capitalize;font-weight:bold}
@media(max-width:600px){body{padding:12px}.invoice{padding:24px}.row{display:block}.row strong{display:block;margin-top:6px}}
</style></head>
<body><article class="invoice">
<h1>Kost Camp M2</h1><p class="muted">Invoice pembayaran kost</p>
<div class="row"><span>Nomor invoice</span><strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
<div class="row"><span>Nama penghuni</span><strong>${escapeHtml(invoice.customerName || "-")}</strong></div>
<div class="row"><span>Kamar</span><strong>${escapeHtml(invoice.roomName || "-")}</strong></div>
<div class="row"><span>Jatuh tempo</span><strong>${new Date(invoice.dueDate).toLocaleDateString("id-ID")}</strong></div>
<div class="row"><span>Status</span><strong class="status">${escapeHtml(invoice.status)}</strong></div>
<div class="row total"><span>Total</span><strong>${money(invoice.amount)}</strong></div>
<p class="muted">Dokumen ini dibuat oleh sistem Kost Camp M2.</p>
</article></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadInvoicePdf = async (url: string): Promise<void> => {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message || "Invoice PDF gagal diunduh");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "invoice.pdf";
  link.click();
  URL.revokeObjectURL(objectUrl);
};
import { authHeaders } from "../config";
