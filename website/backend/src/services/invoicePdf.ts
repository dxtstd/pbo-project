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
  browserPromise ||= puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browserPromise;
};

export const generateInvoicePdf = async (invoice: InvoicePdfData): Promise<Uint8Array> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const amount = `Rp ${invoice.amount.toLocaleString("id-ID")}`;
    const startDate = (invoice.periodStartDate || invoice.dueDate).toLocaleDateString("id-ID");
    const endDate = (invoice.periodEndDate || invoice.periodStartDate || invoice.dueDate).toLocaleDateString("id-ID");
    const periodMonths = invoice.periodMonths || 1;
    const monthlyAmount = Math.round(invoice.amount / periodMonths);
    const statusLabels: Record<string, string> = {
      paid: "Lunas",
      pending: "Menunggu pembayaran",
      unpaid: "Belum dibayar",
      overdue: "Terlambat",
      cancelled: "Dibatalkan",
    };
    const statusLabel = statusLabels[invoice.status] || invoice.status;
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4; margin: 0; }
            body { font-family: Arial, sans-serif; color: #33251f; margin: 0; background: #f5eee9; }
            .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm; background: #fffaf6; }
            .topbar { height: 7px; margin: -18mm -18mm 28px; background: #694536; }
            .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #ead8ce; }
            .brand { color: #694536; font-size: 25px; font-weight: 700; letter-spacing: .2px; }
            .subtitle, .muted { color: #806d64; font-size: 12px; }
            .title { text-align: right; } .title h1 { margin: 0; color: #694536; font-size: 28px; letter-spacing: 1px; }
            .title p { margin: 6px 0 0; color: #806d64; font-size: 12px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 26px 0; }
            .meta-card { padding: 14px 16px; border: 1px solid #ead8ce; border-radius: 10px; background: #fff; }
            .label { margin-bottom: 6px; color: #806d64; font-size: 10px; text-transform: uppercase; letter-spacing: .8px; }
            .value { font-size: 14px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { padding: 11px 12px; color: #fffaf6; background: #694536; font-size: 11px; text-align: left; }
            td { padding: 14px 12px; border-bottom: 1px solid #ead8ce; font-size: 12px; }
            th:last-child, td:last-child { text-align: right; }
            .summary { width: 300px; margin: 24px 0 0 auto; }
            .summary-row { display: flex; justify-content: space-between; gap: 20px; padding: 8px 0; color: #806d64; font-size: 12px; }
            .grand-total { display: flex; justify-content: space-between; gap: 20px; margin-top: 8px; padding: 14px 0; border-top: 2px solid #694536; color: #694536; font-size: 18px; font-weight: 700; }
            .status { display: inline-block; margin-top: 26px; padding: 7px 12px; border-radius: 999px; color: #694536; background: #f1dfd5; font-size: 11px; font-weight: 700; }
            .note { margin-top: 50px; padding: 14px 16px; border-left: 3px solid #c89579; background: #fbf1eb; color: #806d64; font-size: 11px; line-height: 1.6; }
            .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #ead8ce; color: #9a877e; font-size: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <main class="page">
            <div class="topbar"></div>
            <header class="header">
              <div><div class="brand">Kost Camp M2</div><div class="subtitle">Hunian nyaman, pembayaran tertata</div></div>
              <div class="title"><h1>INVOICE</h1><p>${escapeHtml(invoice.invoiceNumber)}</p></div>
            </header>
            <section class="meta">
              <div class="meta-card"><div class="label">Ditagihkan kepada</div><div class="value">${escapeHtml(invoice.customerName)}</div><div class="subtitle">Penghuni kamar ${escapeHtml(invoice.roomName)}</div></div>
              <div class="meta-card"><div class="label">Periode pembayaran</div><div class="value">${startDate} – ${endDate}</div><div class="subtitle">Dibuat pada ${new Date().toLocaleDateString("id-ID")}</div></div>
            </section>
            <table><thead><tr><th>Deskripsi</th><th>Periode</th><th>Harga</th><th>Jumlah</th></tr></thead><tbody>
              <tr><td><strong>Sewa ${escapeHtml(invoice.roomName)}</strong><br><span class="muted">Biaya hunian bulanan</span></td><td>${periodMonths} bulan</td><td>${`Rp ${monthlyAmount.toLocaleString("id-ID")}`}</td><td>${amount}</td></tr>
            </tbody></table>
            <div class="summary"><div class="summary-row"><span>Subtotal</span><strong>${amount}</strong></div><div class="summary-row"><span>Biaya tambahan</span><strong>Rp 0</strong></div><div class="grand-total"><span>Total</span><span>${amount}</span></div></div>
            <div class="status">Status: ${escapeHtml(statusLabel)}</div>
            <div class="note"><strong>Catatan pembayaran</strong><br>Mohon lakukan pembayaran sesuai nominal invoice. Simpan dokumen ini sebagai bukti tagihan. Invoice ini dibuat secara otomatis oleh sistem Kost Camp M2.</div>
            <footer class="footer">Terima kasih telah menjadi bagian dari Kost Camp M2 · Dokumen resmi sistem</footer>
          </main>
        </body>
      </html>`;
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
};
