import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../../config";

export function CustomerPayment() {
  const [invoice, setInvoice] = useState({ invoiceNumber: "INV-DEMO", amount: 470000, status: "unpaid" });
  const [method, setMethod] = useState<"qris" | "bank_transfer" | "cash">("qris");
  const [message, setMessage] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<{ actions?: { name: string; url: string }[]; vaNumbers?: { bank: string; va_number: string }[] }>({});

  useEffect(() => {
    const customerId = localStorage.getItem("customerId") || "demo-customer";
    fetch(`${API_URL}/dashboard/customer/${customerId}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { invoices: typeof invoice[] }) => {
      const unpaid = data.invoices.find((item) => item.status !== "paid");
      if (unpaid) setInvoice(unpaid);
    }).catch(() => undefined);
  }, []);

  const pay = async () => {
    const endpoint = method === "cash" ? "/payment/cash" : "/payment/charge";
    const body = method === "cash" ? { invoiceNumber: invoice.invoiceNumber } : { invoiceNumber: invoice.invoiceNumber, paymentType: method };
    const response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as typeof paymentInfo & { redirectUrl?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    else if (response.ok) {
      setPaymentInfo(result);
      setMessage(method === "cash" ? "Pembayaran cash menunggu konfirmasi pemilik." : "Gunakan instruksi pembayaran di bawah.");
    } else setMessage("Pembayaran gagal dibuat.");
  };

  return <main className="min-h-[calc(100dvh-76px)] bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12"><div className="mx-auto max-w-3xl"><Link to="/dashboard/customer" className="text-sm text-[#694536]">← Kembali ke dashboard</Link><div className="mt-4 rounded-2xl border border-[#d1b4a4] bg-[#fffaf5] p-5 shadow-sm sm:p-8"><h1 className="font-serif text-3xl font-bold">Pembayaran</h1><p className="mt-1 text-sm text-[#765e52]">Selesaikan tagihan dengan metode pilihanmu.</p><div className="mt-6 rounded-xl border border-[#dfc5b8] p-4"><div className="flex justify-between"><span>Tagihan {invoice.invoiceNumber}</span><b>Rp. {invoice.amount.toLocaleString("id-ID")}</b></div></div><h2 className="mt-6 font-bold">Metode pembayaran</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">{[["qris", "QRIS", "Otomatis"], ["bank_transfer", "Virtual Account", "Otomatis"], ["cash", "Cash", "Konfirmasi owner"]].map(([value, label, detail]) => <button key={value} onClick={() => setMethod(value as typeof method)} className={`rounded-xl border p-4 text-left ${method === value ? "border-[#694536] bg-[#ead0c2]" : "border-[#dfc5b8]"}`}><b>{label}</b><span className="mt-1 block text-xs text-[#765e52]">{detail}</span></button>)}</div><button onClick={() => void pay()} className="mt-7 w-full rounded-lg bg-[#694536] py-3 font-semibold text-white hover:bg-[#513329]">{method === "cash" ? "Kirim permintaan cash" : "Lanjutkan pembayaran"}</button>{message && <p className="mt-4 rounded-lg bg-[#ead0c2] p-3 text-sm">{message}</p>}{paymentInfo.actions?.[0] && <img src={paymentInfo.actions[0].url} alt="QRIS payment code" className="mx-auto mt-5 h-56 w-56" />}{paymentInfo.vaNumbers?.map((va) => <p key={va.va_number} className="mt-4 rounded-lg border border-[#dfc5b8] p-4">Virtual Account {va.bank.toUpperCase()}: <b>{va.va_number}</b></p>)}</div></div></main>;
}
