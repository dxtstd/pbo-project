import puppeteer, { Browser } from "puppeteer";

type InvoicePdfData = {
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: string;
  customerName: string;
  roomName: string;
  periodStartDate?: Date;
  periodEndDate?: Date;
  periodMonths?: number;
};

let browserPromise: Promise<Browser> | undefined;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[character] || character));

const getBrowser = (): Promise<Browser> => {
  browserPromise ||= puppeteer.launch({ headless: true });
  return browserPromise;
};

export const generateInvoicePdf = async (invoice: InvoicePdfData): Promise<Uint8Array> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const amount = `Rp ${invoice.amount.toLocaleString("id-ID")}`;
    const dueDate = invoice.dueDate.toLocaleDateString("id-ID");
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #3e2f28; margin: 0; padding: 40px; background: #f7eee8; }
            .invoice { max-width: 720px; margin: auto; background: #fffaf5; padding: 40px; border: 1px solid #dcc2b3; border-radius: 16px; }
            h1 { margin: 0 0 8px; color: #694536; } .muted { color: #765e52; }
            .row { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #ead0c2; padding: 14px 0; }
            .total { font-size: 22px; font-weight: bold; border: 0; margin-top: 10px; }
            .status { text-transform: capitalize; font-weight: bold; }
          </style>
        </head>
        <body>
          <article class="invoice">
            <h1>Kost Lorem Ipsum</h1>
            <p class="muted">Invoice pembayaran kost</p>
            <div class="row"><span>Nomor invoice</span><strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
            <div class="row"><span>Nama penghuni</span><strong>${escapeHtml(invoice.customerName)}</strong></div>
            <div class="row"><span>Kamar</span><strong>${escapeHtml(invoice.roomName)}</strong></div>
            <div class="row"><span>${invoice.periodMonths && invoice.periodMonths > 1 ? "Periode pembayaran" : "Jatuh tempo"}</span><strong>${invoice.periodMonths && invoice.periodMonths > 1 && invoice.periodEndDate ? `${dueDate} - ${invoice.periodEndDate.toLocaleDateString("id-ID")}` : dueDate}</strong></div>
            <div class="row"><span>Status</span><strong class="status">${escapeHtml(invoice.status)}</strong></div>
            <div class="row total"><span>Total</span><strong>${amount}</strong></div>
            <p class="muted">Dokumen ini dibuat oleh sistem Kost Lorem Ipsum.</p>
          </article>
        </body>
      </html>`;
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
};
