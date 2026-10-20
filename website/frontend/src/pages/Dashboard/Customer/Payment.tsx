import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, authHeaders } from "../../../config";

export function CustomerPayment() {
  const [invoice, setInvoice] = useState({ invoiceNumber: "INV-DEMO", amount: 470000, status: "unpaid" });
  const [activeTransaction, setActiveTransaction] = useState<{ transactionId: string; status: string }>();
  const [method, setMethod] = useState<"qris" | "bank_transfer" | "cash">("qris");
  const [message, setMessage] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<{ actions?: { name: string; url: string }[]; vaNumbers?: { bank: string; va_number: string }[] }>({});
  const [months, setMonths] = useState(2);

  useEffect(() => {
    const customerId = localStorage.getItem("userId");
    if (!customerId) return;
    fetch(`${API_URL}/dashboard/customer/${customerId}`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { invoices: typeof invoice[]; transactions?: { transactionId: string; invoiceNumber?: string; status: string }[] }) => {
      const unpaid = data.invoices.find((item) => item.status === "unpaid" || item.status === "overdue");
      if (unpaid) setInvoice(unpaid);
      const transaction = data.transactions?.find((item) => item.invoiceNumber === unpaid?.invoiceNumber && ["pending", "cash_pending"].includes(item.status));
      if (transaction) setActiveTransaction(transaction);
    }).catch(() => undefined);
  }, []);

  const pay = async () => {
    if (activeTransaction) {
      setMessage("Masih ada permintaan pembayaran aktif. Batalkan atau tunggu transaksi sebelumnya selesai.");
      return;
    }
    const endpoint = method === "cash" ? "/payment/cash" : "/payment/charge";
    const body = method === "cash" ? { invoiceNumber: invoice.invoiceNumber } : { invoiceNumber: invoice.invoiceNumber, paymentType: method };
    const response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "content-type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
    const result = await response.json() as typeof paymentInfo & { redirectUrl?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    else if (response.ok) {
      setPaymentInfo(result);
      setMessage(method === "cash" ? "Pembayaran cash menunggu konfirmasi pemilik." : "Gunakan instruksi pembayaran di bawah.");
    } else setMessage((result as { message?: string }).message || "Pembayaran gagal dibuat.");
  };

  const cancelCash = async () => {
    if (!activeTransaction) return;
    const response = await fetch(`${API_URL}/payment/cash/${activeTransaction.transactionId}/cancel`, { method: "POST", headers: authHeaders() });
    if (response.ok) {
      setActiveTransaction(undefined);
      setMessage("Permintaan cash dibatalkan. Metode pembayaran lain sudah dapat dipilih.");
    } else setMessage("Permintaan cash gagal dibatalkan.");
  };

  const createCombinedInvoice = async () => {
    const customerId = localStorage.getItem("userId");
    if (!customerId) return;
    const response = await fetch(`${API_URL}/dashboard/customer/${customerId}/invoices/combined`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ months }),
    });
    const result = await response.json() as { invoice?: typeof invoice; message?: string };
    if (!response.ok || !result.invoice) {
      setMessage(result.message || "Invoice beberapa bulan gagal dibuat.");
      return;
    }
    setInvoice(result.invoice);
    setMessage(`Invoice gabungan ${months} bulan berhasil dibuat.`);
  };

  return <main className="min-h-[calc(100dvh-76px)] bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard/customer" className="text-sm text-[#694536]">← Kembali ke dashboard</Link>
      <div className="mt-4 rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-8">
        <h1 className="font-serif text-3xl font-bold">Pembayaran</h1>
        <p className="mt-1 text-sm text-[#765e52]">Selesaikan tagihan dengan metode pilihanmu.</p>
        <div className="mt-6 rounded-xl border border-[#dfc5b8] p-4"><div className="flex justify-between"><span>Tagihan {invoice.invoiceNumber}</span><b>Rp. {invoice.amount.toLocaleString("id-ID")}</b></div></div>
        {activeTransaction && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#ead0c2] p-4 text-sm"><span>Permintaan pembayaran sebelumnya masih aktif.</span><button type="button" onClick={() => void cancelCash()} className="rounded-lg border border-[#694536] px-3 py-2 font-semibold">Batalkan permintaan cash</button></div>}
        <h2 className="mt-6 font-bold">Metode pembayaran</h2>
        <div className="mt-4 rounded-xl border border-[#dfc5b8] bg-[#f8eee7] p-4"><p className="font-semibold">Bayar beberapa bulan sekaligus</p><p className="mt-1 text-sm text-[#765e52]">Buat satu invoice gabungan untuk 2–10 bulan.</p><div className="mt-3 flex flex-wrap gap-2"><select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="rounded-lg border border-[#caa897] bg-white px-3 py-2">{Array.from({ length: 9 }, (_, index) => <option key={index + 2} value={index + 2}>{index + 2} bulan</option>)}</select><button type="button" onClick={() => void createCombinedInvoice()} disabled={Boolean(activeTransaction)} className="rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Buat invoice gabungan</button></div></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">{[["qris", "QRIS", "Otomatis"], ["bank_transfer", "Virtual Account", "Otomatis"], ["cash", "Cash", "Konfirmasi owner"]].map(([value, label, detail]) => <button key={value} disabled={Boolean(activeTransaction)} onClick={() => setMethod(value as typeof method)} className={`rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50 ${method === value ? "border-[#694536] bg-[#ead0c2]" : "border-[#dfc5b8]"}`}><b>{label}</b><span className="mt-1 block text-xs text-[#765e52]">{detail}</span></button>)}</div>
        <button disabled={Boolean(activeTransaction)} onClick={() => void pay()} className="mt-7 w-full rounded-lg bg-[#694536] py-3 font-semibold text-white hover:bg-[#513329] disabled:opacity-50">{method === "cash" ? "Kirim permintaan cash" : "Lanjutkan pembayaran"}</button>
        {message && <p className="mt-4 rounded-lg bg-[#ead0c2] p-3 text-sm">{message}</p>}
        {paymentInfo.actions?.[0] && <img src={paymentInfo.actions[0].url} alt="QRIS payment code" className="mx-auto mt-5 h-56 w-56" />}
        {paymentInfo.vaNumbers?.map((va) => <p key={va.va_number} className="mt-4 rounded-lg border border-[#dfc5b8] p-4">Virtual Account {va.bank.toUpperCase()}: <b>{va.va_number}</b></p>)}
      </div>
    </div>
  </main>;
}
