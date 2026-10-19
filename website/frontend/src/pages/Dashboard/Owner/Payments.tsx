import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { confirmCash } from "./api";
import type { OwnerData } from "./types";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
const money = (value: number) => `Rp. ${value.toLocaleString("id-ID")}`;

export function OwnerPayments() {
  const { data, refresh, setMessage } = useOutletContext<Context>();
  const pending = data.cashPayments || [];
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState<"all" | "success" | "failed" | "pending">("all");
  const confirm = async (id: string) => { try { await confirmCash(id); setMessage("Pembayaran cash dikonfirmasi."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Pembayaran gagal dikonfirmasi."); } };
  const statusGroup = (status: string) => {
    if (["settlement", "capture", "confirmed"].includes(status)) return "success";
    if (["deny", "cancel", "expire"].includes(status)) return "failed";
    return "pending";
  };
  const filteredTransactions = useMemo(
    () => data.transactions.filter((transaction) => filter === "all" || statusGroup(transaction.status) === filter).slice(0, pageSize),
    [data.transactions, filter, pageSize],
  );
  const customerName = (customerId: string) => data.customers.find((customer) => customer.customerId === customerId)?.firstname || "Penghuni";
  const statusLabel = (status: string) => statusGroup(status) === "success" ? "Berhasil" : statusGroup(status) === "failed" ? "Gagal" : "Menunggu";
  const statusStyle = (status: string) => statusGroup(status) === "success" ? "bg-[#d9ead7] text-[#315c32]" : statusGroup(status) === "failed" ? "bg-[#f1d5d0] text-[#8a3c32]" : "bg-[#ead0c2] text-[#694536]";
  return <>
    <div><h2 className="text-2xl font-bold">Pembayaran</h2><p className="text-sm text-[#765e52]">Tinjau pembayaran penghuni dan konfirmasi pembayaran cash.</p></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5"><p className="text-sm text-[#765e52]">Menunggu konfirmasi</p><p className="mt-2 text-3xl font-bold">{pending.length}</p></div><div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5"><p className="text-sm text-[#765e52]">Total invoice</p><p className="mt-2 text-3xl font-bold">{data.invoices.length}</p></div><div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5"><p className="text-sm text-[#765e52]">Pembayaran otomatis</p><p className="mt-2 text-3xl font-bold">{data.invoices.filter((invoice) => invoice.status === "paid").length}</p></div></div>
    <section className="mt-8 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5"><h3 className="text-lg font-bold">Cash menunggu konfirmasi</h3><p className="mb-4 text-sm text-[#765e52]">Pastikan pembayaran sudah diterima sebelum mengonfirmasi.</p>{pending.length ? <div className="space-y-3">{pending.map((payment) => <div key={payment.transactionId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8eee7] p-4"><div className="text-sm"><b>{payment.invoiceNumber || payment.transactionId}</b><p className="text-[#765e52]">{money(payment.totalAmount)}</p></div><button onClick={() => void confirm(payment.transactionId)} className="rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white">Konfirmasi diterima</button></div>)}</div> : <div className="rounded-xl border border-dashed border-[#caa897] p-8 text-center text-sm text-[#765e52]">Tidak ada pembayaran cash yang menunggu.</div>}</section>
    <section className="mt-8 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 className="text-lg font-bold">Riwayat transaksi</h3><p className="text-sm text-[#765e52]">Menampilkan transaksi terbaru, maksimal 100 data.</p></div>
        <div className="flex flex-wrap gap-2">
          {(["all", "success", "failed", "pending"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-[#694536] text-white" : "bg-[#f8eee7] text-[#765e52]"}`}>{value === "all" ? "Semua" : value === "success" ? "Berhasil" : value === "failed" ? "Gagal" : "Pending"}</button>)}
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="Jumlah transaksi" className="rounded-full border border-[#caa897] bg-white px-3 py-1.5 text-xs"><option value={10}>10 transaksi</option><option value={20}>20 transaksi</option><option value={30}>30 transaksi</option></select>
        </div>
      </div>
      {filteredTransactions.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-[#ead0c2] text-xs text-[#765e52]"><tr><th className="px-3 py-3 font-medium">Transaksi</th><th className="px-3 py-3 font-medium">Penghuni</th><th className="px-3 py-3 font-medium">Metode</th><th className="px-3 py-3 font-medium">Tanggal</th><th className="px-3 py-3 font-medium">Nominal</th><th className="px-3 py-3 font-medium">Status</th></tr></thead><tbody>{filteredTransactions.map((transaction) => <tr key={transaction.transactionId} className="border-b border-[#f0dfd5] last:border-0"><td className="px-3 py-3"><b>{transaction.invoiceNumber || transaction.transactionId}</b><span className="block text-xs text-[#765e52]">{transaction.roomId}</span></td><td className="px-3 py-3">{customerName(transaction.customerId)}</td><td className="px-3 py-3">{transaction.paymentMethod}</td><td className="px-3 py-3">{new Date(transaction.paymentDate).toLocaleDateString("id-ID")}</td><td className="px-3 py-3 font-semibold">{money(transaction.totalAmount)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(transaction.status)}`}>{statusLabel(transaction.status)}</span></td></tr>)}</tbody></table></div> : <div className="mt-4 rounded-xl border border-dashed border-[#caa897] p-8 text-center text-sm text-[#765e52]">Belum ada transaksi dengan filter ini.</div>}
      <p className="mt-4 text-xs text-[#765e52]">Menampilkan {filteredTransactions.length} transaksi</p>
    </section>
  </>;
}
