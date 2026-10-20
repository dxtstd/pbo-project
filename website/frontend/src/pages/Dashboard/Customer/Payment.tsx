import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, authHeaders } from "../../../config";

export function CustomerPayment() {
  const [invoice, setInvoice] = useState<{ invoiceNumber: string; amount: number; status: string }>();
  const [hasRoom, setHasRoom] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<{ transactionId: string; status: string; expiresAt?: string; paymentMethod?: string }>();
  const [method, setMethod] = useState<"qris" | "bank_transfer" | "cash">("qris");
  const [message, setMessage] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<{ actions?: { name: string; url: string }[]; vaNumbers?: { bank: string; va_number: string }[] }>({});
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const customerId = localStorage.getItem("userId");
    if (!customerId) return;
    fetch(`${API_URL}/dashboard/customer/${customerId}`, { headers: authHeaders() }).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { room?: object; invoices: NonNullable<typeof invoice>[]; transactions?: { transactionId: string; invoiceNumber?: string; status: string; expiresAt?: string; paymentMethod?: string; paymentActions?: { name: string; url: string }[]; vaNumbers?: { bank: string; va_number: string }[] }[] }) => {
      const unpaid = data.invoices.find((item) => ["pending", "unpaid", "overdue"].includes(item.status));
      if (unpaid) setInvoice(unpaid);
      setHasRoom(Boolean(data.room));
      const transaction = data.transactions?.find((item) => item.invoiceNumber === unpaid?.invoiceNumber && ["pending", "cash_pending"].includes(item.status));
      if (transaction) {
        setActiveTransaction(transaction);
        setMethod(transaction.paymentMethod === "Bank Transfer" ? "bank_transfer" : transaction.paymentMethod === "QRIS" ? "qris" : "cash");
        setPaymentInfo({ actions: transaction.paymentActions, vaNumbers: transaction.vaNumbers });
      }
    }).catch(() => undefined);
  }, []);

  const pay = async () => {
    if (!invoice) {
      setMessage("Belum ada invoice pembayaran.");
      return;
    }
    if (activeTransaction) {
      setMessage("Masih ada permintaan pembayaran aktif. Batalkan atau tunggu transaksi sebelumnya selesai.");
      return;
    }
    const endpoint = method === "cash" ? "/payment/cash" : "/payment/charge";
    const body = method === "cash" ? { invoiceNumber: invoice.invoiceNumber } : { invoiceNumber: invoice.invoiceNumber, paymentType: method };
    const response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "content-type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
    const result = await response.json() as typeof paymentInfo & { redirectUrl?: string; transactionId?: string; status?: string; expiresAt?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    else if (response.ok) {
      setPaymentInfo(result);
      if (result.transactionId) setActiveTransaction({ transactionId: result.transactionId, status: result.status || "cash_pending", expiresAt: result.expiresAt, paymentMethod: method === "qris" ? "QRIS" : method === "bank_transfer" ? "Bank Transfer" : "Cash" });
      setMessage(method === "cash" ? "Pembayaran cash menunggu konfirmasi pemilik." : "Gunakan instruksi pembayaran di bawah.");
    } else setMessage((result as { message?: string }).message || "Pembayaran gagal dibuat.");
  };

  const adjustMonths = (amount: number) => setMonths((current) => Math.min(12, Math.max(1, current + amount)));

  const requestExtension = async () => {
    const customerId = localStorage.getItem("userId");
    if (!customerId || !hasRoom) {
      setMessage("Kamar hanya dapat ditentukan oleh pemilik kost.");
      return;
    }
    const response = await fetch(`${API_URL}/dashboard/customer/${customerId}/invoices/extend`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ months }),
    });
    const result = await response.json() as { invoice?: NonNullable<typeof invoice>; message?: string };
    if (!response.ok || !result.invoice) {
      setMessage(result.message || "Pemesanan kamar gagal dibuat.");
      return;
    }
    setInvoice(result.invoice);
    setMessage(`Request perpanjangan ${months} bulan dibuat. Selesaikan pembayaran sebelum request kedaluwarsa.`);
  };

  const cancelCash = async () => {
    if (!activeTransaction) return;
    const response = await fetch(`${API_URL}/payment/cash/${activeTransaction.transactionId}/cancel`, { method: "POST", headers: authHeaders() });
    if (response.ok) {
      setActiveTransaction(undefined);
      setMessage("Permintaan cash dibatalkan. Metode pembayaran lain sudah dapat dipilih.");
    } else setMessage("Permintaan cash gagal dibatalkan.");
  };

  return <main className="min-h-screen bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard/customer" className="text-sm text-[#694536]">← Kembali ke dashboard</Link>
      <div className="mt-4 rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-8">
        <h1 className="font-serif text-3xl font-bold">Pembayaran</h1>
        <p className="mt-1 text-sm text-[#765e52]">Selesaikan tagihan dengan metode pilihanmu.</p>
        {invoice ? <div className="mt-6 rounded-xl border border-[#dfc5b8] p-4"><div className="flex justify-between"><span>Tagihan {invoice.invoiceNumber}</span><b>Rp. {invoice.amount.toLocaleString("id-ID")}</b></div></div> : <div className="mt-6 rounded-xl border border-dashed border-[#dfc5b8] p-4 text-sm text-[#765e52]">Belum ada invoice. Pesan kamar terlebih dahulu untuk membuat tagihan.</div>}
        {activeTransaction && <div className="mt-4 rounded-xl border border-[#d1b4a4] bg-[#ead0c2] p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span>Pembayaran {activeTransaction.paymentMethod || "aktif"} masih menunggu pembayaran{activeTransaction.expiresAt ? ` sampai ${new Date(activeTransaction.expiresAt).toLocaleString("id-ID")}` : ""}.</span>{activeTransaction.status === "cash_pending" && <button type="button" onClick={() => void cancelCash()} className="rounded-lg border border-[#694536] px-3 py-2 font-semibold">Batalkan permintaan cash</button>}</div>{paymentInfo.actions?.[0] && <div className="mt-4 rounded-xl bg-white p-4 text-center"><p className="mb-3 font-semibold">Scan QRIS untuk melanjutkan pembayaran</p><img src={paymentInfo.actions[0].url} alt="QRIS payment code" className="mx-auto h-56 w-56" /></div>}{paymentInfo.vaNumbers?.map((va) => <p key={va.va_number} className="mt-4 rounded-lg bg-white p-4">Virtual Account {va.bank.toUpperCase()}: <b>{va.va_number}</b></p>)}</div>}
        <h2 className="mt-6 font-bold">Metode pembayaran</h2>
        {hasRoom && <div className="mt-4 rounded-xl border border-[#dfc5b8] bg-[#f8eee7] p-4"><p className="font-semibold">Tambah durasi sewa</p><p className="mt-1 text-sm text-[#765e52]">Pemilik kost tetap menentukan kamar. Request ini akan terkunci sampai dibayar atau dibatalkan owner.</p><div className="mt-3 flex items-center justify-between rounded-lg border border-[#caa897] bg-white p-2"><span className="text-sm font-semibold">Durasi tambahan</span><div className="flex items-center gap-3"><button type="button" onClick={() => adjustMonths(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#caa897] text-lg font-bold">−</button><b className="min-w-16 text-center">{months} bulan</b><button type="button" onClick={() => adjustMonths(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#caa897] text-lg font-bold">+</button></div></div><button type="button" onClick={() => void requestExtension()} disabled={Boolean(activeTransaction)} className="mt-3 w-full rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Request perpanjangan</button></div>}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">{[["qris", "QRIS", "Otomatis"], ["bank_transfer", "Virtual Account", "Otomatis"], ["cash", "Cash", "Konfirmasi owner"]].map(([value, label, detail]) => <button key={value} disabled={Boolean(activeTransaction)} onClick={() => setMethod(value as typeof method)} className={`rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50 ${method === value ? "border-[#694536] bg-[#ead0c2]" : "border-[#dfc5b8]"}`}><b>{label}</b><span className="mt-1 block text-xs text-[#765e52]">{detail}</span></button>)}</div>
        <button disabled={!invoice || Boolean(activeTransaction)} onClick={() => void pay()} className="mt-7 w-full rounded-lg bg-[#694536] py-3 font-semibold text-white hover:bg-[#513329] disabled:opacity-50">{method === "cash" ? "Kirim permintaan cash" : "Lanjutkan pembayaran"}</button>
        {message && <p className="mt-4 rounded-lg bg-[#ead0c2] p-3 text-sm">{message}</p>}
        {!activeTransaction && paymentInfo.actions?.[0] && <img src={paymentInfo.actions[0].url} alt="QRIS payment code" className="mx-auto mt-5 h-56 w-56" />}
        {!activeTransaction && paymentInfo.vaNumbers?.map((va) => <p key={va.va_number} className="mt-4 rounded-lg border border-[#dfc5b8] p-4">Virtual Account {va.bank.toUpperCase()}: <b>{va.va_number}</b></p>)}
      </div>
    </div>
  </main>;
}
