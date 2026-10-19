import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../../../config";

type Invoice = {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: "paid" | "unpaid" | "overdue";
};

type CustomerDashboard = {
  customer: { firstname: string; lastname: string };
  room?: { name: string; price: number };
  invoices: Invoice[];
};

const demo: CustomerDashboard = {
  customer: { firstname: "Bambang", lastname: "" },
  room: { name: "Kamar 01", price: 450000 },
  invoices: [{ invoiceNumber: "INV-DEMO", amount: 470000, dueDate: new Date().toISOString(), status: "unpaid" }],
};

const money = (value: number) => `Rp. ${value.toLocaleString("id-ID")}`;

export function CustomerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerDashboard>(demo);
  const [notice, setNotice] = useState("");
  const customerId = localStorage.getItem("customerId") || "demo-customer";

  useEffect(() => {
    fetch(`${API_URL}/dashboard/customer/${customerId}`)
      .then((response) => response.ok ? response.json() as Promise<CustomerDashboard> : Promise.reject(new Error("demo")))
      .then(setData)
      .catch(() => undefined);
  }, [customerId]);

  const invoice = data.invoices.find((item) => item.status !== "paid") || data.invoices[0];
  const submitCash = async () => {
    if (!invoice) return;
    const response = await fetch(`${API_URL}/payment/cash`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
    });
    setNotice(response.ok ? "Permintaan pembayaran tunai dikirim. Menunggu konfirmasi pemilik." : "Pembayaran tunai gagal dikirim.");
  };

  const payOnline = async (paymentType: "qris" | "bank_transfer") => {
    if (!invoice) return;
    const response = await fetch(`${API_URL}/payment/charge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, paymentType }),
    });
    const result = await response.json() as { redirectUrl?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    else setNotice("Pembayaran online belum dapat dibuat.");
  };

  return (
    <main className="min-h-[calc(100dvh-76px)] bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-[#765e52]">Dashboard Penghuni</p><h1 className="font-serif text-3xl font-bold">Halo, {data.customer.firstname}</h1></div>
          <button onClick={() => { localStorage.removeItem("customerId"); navigate("/"); }} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm">Keluar</button>
        </header>
        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-sm text-[#765e52]">Kamar aktif</p><h2 className="text-2xl font-bold">{data.room?.name || "Belum ada kamar"}</h2></div><span className="rounded-full bg-[#d9b9aa] px-3 py-1 text-xs font-semibold">Berpenghuni</span></div>
            <p className="text-[#765e52]">Tagihan bulan ini</p>
            <p className="mt-1 text-3xl font-bold">{money(invoice?.amount || 0)}</p>
            <p className="mt-2 text-sm text-[#765e52]">Jatuh tempo: {invoice ? new Date(invoice.dueDate).toLocaleDateString("id-ID") : "-"}</p>
            <Link to="/dashboard/customer/payment" className="mt-6 inline-block rounded-lg bg-[#694536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#513329]">Buka pembayaran</Link>
          </div>
          <div className="rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-7">
            <p className="mb-4 font-semibold">Riwayat tagihan</p>
            <div className="space-y-3">{data.invoices.map((item) => <div key={item.invoiceNumber} className="flex items-center justify-between rounded-lg border border-[#e0c8bb] p-3 text-sm"><span><b>{item.invoiceNumber}</b><br /><span className="text-[#765e52]">{new Date(item.dueDate).toLocaleDateString("id-ID")}</span></span><span className={item.status === "paid" ? "text-green-700" : "text-orange-700"}>{item.status}</span></div>)}</div>
          </div>
        </section>
        {notice && <p className="mt-4 rounded-lg bg-[#ead0c2] p-3 text-sm">{notice}</p>}
        <div className="mt-5 rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 sm:p-7"><h2 className="text-xl font-bold">Pembayaran cepat</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><button onClick={() => void payOnline("qris")} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>QRIS</b><span className="mt-1 block text-sm text-[#765e52]">Konfirmasi otomatis</span></button><button onClick={() => void payOnline("bank_transfer")} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>Virtual Account</b><span className="mt-1 block text-sm text-[#765e52]">Konfirmasi otomatis</span></button><button onClick={() => void submitCash()} className="rounded-lg border border-[#caa897] p-4 text-left hover:bg-[#f4e6dc]"><b>Cash</b><span className="mt-1 block text-sm text-[#765e52]">Menunggu konfirmasi owner</span></button></div></div>
      </div>
    </main>
  );
}
