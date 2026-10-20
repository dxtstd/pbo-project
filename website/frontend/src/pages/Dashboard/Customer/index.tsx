import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL, apiFetch, authHeaders } from "../../../config";
import { downloadInvoicePdf } from "../../../utils/invoiceGenerator";
import { Toast } from "../../../components/Toast";
import { useAuthStore } from "../../../stores/auth";
import { ApiLoading } from "../../../components/ApiLoading";

type Invoice = {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "unpaid" | "overdue" | "cancelled";
  periodStartDate?: string;
  periodEndDate?: string;
  periodMonths?: number;
};

type CustomerDashboard = {
  customer: { firstname: string; lastname: string };
  room?: { name: string; price: number; rentalStartDate?: string };
  invoices: Invoice[];
};

const money = (value: number) => `Rp. ${value.toLocaleString("id-ID")}`;

export function CustomerDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [data, setData] = useState<CustomerDashboard>();
  const [notice, setNotice] = useState("");
  const customerId = localStorage.getItem("userId");

  useEffect(() => {
    if (!customerId) { navigate("/login"); return; }
    apiFetch(`${API_URL}/dashboard/customer/${customerId}`, { headers: authHeaders() })
      .then((response) => response.ok ? response.json() as Promise<CustomerDashboard> : Promise.reject(new Error("demo")))
      .then(setData)
      .catch(() => navigate("/login"));
  }, [customerId, navigate]);

  if (!data) return <ApiLoading />;
  const activeInvoices = data.invoices.filter((item) => item.status === "pending" || item.status === "unpaid" || item.status === "overdue");
  const invoice = activeInvoices[0];
  const rentalEnd = [...data.invoices]
    .filter((item) => item.status === "paid" && item.periodEndDate)
    .sort((left, right) => new Date(right.periodEndDate || 0).getTime() - new Date(left.periodEndDate || 0).getTime())[0]?.periodEndDate;
  const remainingDays = rentalEnd ? Math.max(0, Math.ceil((new Date(rentalEnd).getTime() - Date.now()) / 86400000)) : undefined;
  const remainingMonths = remainingDays === undefined ? undefined : Math.floor(remainingDays / 30);
  const submitCash = async () => {
    if (!invoice) return;
    const response = await apiFetch(`${API_URL}/payment/cash`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
    });
    setNotice(response.ok ? "Permintaan pembayaran tunai dikirim. Menunggu konfirmasi pemilik." : "Pembayaran tunai gagal dikirim.");
  };

  const payOnline = async (paymentType: "qris" | "bank_transfer") => {
    if (!invoice) return;
    const response = await apiFetch(`${API_URL}/payment/charge`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, paymentType }),
    });
    const result = await response.json() as { redirectUrl?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    else setNotice("Pembayaran online belum dapat dibuat.");
  };
  const downloadCustomerInvoice = async (invoiceNumber: string) => {
    if (!customerId) return;
    try {
      await downloadInvoicePdf(`${API_URL}/dashboard/customer/${customerId}/invoices/${encodeURIComponent(invoiceNumber)}/pdf`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invoice PDF gagal diunduh.");
    }
  };
  return (
    <main className="min-h-screen bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-[#765e52]">Dashboard Penghuni</p><h1 className="font-serif text-3xl font-bold">Halo, {data.customer.firstname}</h1></div>
          <button onClick={() => { logout(); navigate("/", { replace: true }); }} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm">Keluar</button>
        </header>
        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-sm text-[#765e52]">Kamar aktif</p><h2 className="text-2xl font-bold">{data.room?.name || "Belum ada kamar"}</h2></div><span className="rounded-full bg-[#d9b9aa] px-3 py-1 text-xs font-semibold">Berpenghuni</span></div>
            {remainingDays !== undefined && <p className="mb-4 rounded-lg bg-[#f8eee7] p-3 text-sm text-[#765e52]">Sisa sewa: <b>{remainingMonths} bulan {remainingDays % 30} hari</b> (sampai {new Date(rentalEnd || "").toLocaleDateString("id-ID")})</p>}
            {invoice ? <><p className="text-[#765e52]">Tagihan aktif</p><p className="mt-1 text-3xl font-bold">{money(invoice.amount)}</p><p className="mt-2 text-sm text-[#765e52]">Status: {invoice.status} · jatuh tempo: {new Date(invoice.dueDate).toLocaleDateString("id-ID")}</p><Link to="/dashboard/customer/payment" className="mt-6 inline-block rounded-lg bg-[#694536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#513329]">Buka pembayaran</Link></> : <><p className="text-[#765e52]">Kamar dan tagihan</p><p className="mt-2 text-xl font-semibold">{data.room ? "Tidak ada tagihan aktif" : "Belum memiliki kamar"}</p><p className="mt-2 text-sm text-[#765e52]">{data.room ? "Invoice berikutnya akan dibuat otomatis menjelang H-7 atau tanggal jatuh tempo." : "Kamar ditentukan dan di-assign oleh pemilik kost."}</p>{data.room && <Link to="/dashboard/customer/payment" className="mt-6 inline-block rounded-lg bg-[#694536] px-5 py-3 text-sm font-semibold text-white">Buka pembayaran</Link>}</>}
          </div>
          <div className="rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-7">
            <p className="mb-4 font-semibold">Riwayat tagihan</p>
            <div className="space-y-3">{data.invoices.map((item) => <div key={item.invoiceNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0c8bb] p-3 text-sm"><span><b>{item.invoiceNumber}</b><br /><span className="text-[#765e52]">{item.periodMonths && item.periodMonths > 1 ? `${item.periodMonths} bulan · ` : ""}{new Date(item.dueDate).toLocaleDateString("id-ID")}</span></span><div className="flex items-center gap-3"><span className={item.status === "paid" ? "text-green-700" : item.status === "cancelled" ? "text-[#765e52]" : item.status === "pending" ? "text-blue-700" : "text-orange-700"}>{item.status}</span><button type="button" onClick={() => void downloadCustomerInvoice(item.invoiceNumber)} className="rounded-lg border border-[#caa897] px-3 py-1.5 text-xs font-semibold hover:bg-[#f4e6dc]">Unduh PDF</button></div></div>)}</div>
          </div>
        </section>
        {notice && <Toast message={notice} onClose={() => setNotice("")} />}
        <div className="mt-5 rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 sm:p-7"><h2 className="text-xl font-bold">Pembayaran cepat</h2>{invoice ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><button onClick={() => void payOnline("qris")} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>QRIS</b><span className="mt-1 block text-sm text-[#765e52]">Konfirmasi otomatis</span></button><button onClick={() => void payOnline("bank_transfer")} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>Virtual Account</b><span className="mt-1 block text-sm text-[#765e52]">Konfirmasi otomatis</span></button><button onClick={() => void submitCash()} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>Cash</b><span className="mt-1 block text-sm text-[#765e52]">Menunggu konfirmasi owner</span></button></div> : <p className="mt-3 text-sm text-[#765e52]">Pembayaran akan tersedia setelah invoice aktif dibuat.</p>}</div>
      </div>
    </main>
  );
}
