import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { OwnerData } from "./types";
import { downloadInvoicePdf } from "../../../utils/invoiceGenerator";
import { deleteInvoice, updateInvoice } from "./api";
import { API_URL } from "../../../config";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
const months = ["2026-10", "2026-09", "2026-08"];

export function OwnerReports() {
  const { data, refresh, setMessage } = useOutletContext<Context>();
  const [invoiceToDelete, setInvoiceToDelete] = useState<string>();
  const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const download = (month: string) => {
    const successfulStatuses = ["settlement", "capture", "confirmed"];
    const rows = data.transactions.filter((transaction) => successfulStatuses.includes(transaction.status) && transaction.paymentDate.startsWith(month));
    const csvRows = [
      ["Tanggal pemasukan", "Nomor invoice", "Customer ID", "Nama customer", "Kamar", "Metode pembayaran", "Nominal", "Status transaksi"],
      ...rows.map((transaction) => {
        const customer = invoiceCustomer(transaction.customerId);
        const room = invoiceRoom(transaction.roomId);
        return [
          new Date(transaction.paymentDate).toLocaleString("id-ID"),
          transaction.invoiceNumber || "-",
          transaction.customerId,
          customer ? `${customer.firstname} ${customer.lastname}`.trim() : "Penghuni",
          room?.name || transaction.roomId,
          transaction.paymentMethod,
          transaction.totalAmount,
          transaction.status,
        ];
      }),
    ];
    const csv = `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `rekap-${month}.csv`; link.click(); URL.revokeObjectURL(url);
    setMessage(`Export pemasukan ${month} berhasil diunduh (${rows.length} transaksi berhasil).`);
  };
  const invoiceCustomer = (customerId: string) => data.customers.find((customer) => customer.customerId === customerId);
  const invoiceRoom = (roomId: string) => data.rooms.find((room) => room.roomId === roomId);
  const downloadPdf = async (invoiceNumber: string) => {
    try {
      const ownerId = localStorage.getItem("userId");
      if (!ownerId) throw new Error("Sesi owner tidak ditemukan");
      await downloadInvoicePdf(`${API_URL}/dashboard/owner/${ownerId}/invoices/${encodeURIComponent(invoiceNumber)}/pdf`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invoice PDF gagal diunduh.");
    }
  };
  const editInvoice = async (invoiceNumber: string, amount: number, dueDate: string) => {
    const ownerId = localStorage.getItem("userId");
    if (!ownerId) return;
    const nextAmount = window.prompt("Nominal invoice", String(amount));
    if (nextAmount === null) return;
    const nextDueDate = window.prompt("Tanggal jatuh tempo (YYYY-MM-DD)", dueDate.slice(0, 10));
    if (nextDueDate === null) return;
    try { await updateInvoice(ownerId, invoiceNumber, { amount: Number(nextAmount), dueDate: nextDueDate }); setMessage("Invoice berhasil diperbarui."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Invoice gagal diperbarui."); }
  };
  const removeInvoice = async (invoiceNumber: string) => {
    const ownerId = localStorage.getItem("userId");
    if (!ownerId) return;
    setInvoiceToDelete(invoiceNumber);
  };
  const confirmRemoveInvoice = async () => {
    const ownerId = localStorage.getItem("userId");
    if (!ownerId || !invoiceToDelete) return;
    const invoiceNumber = invoiceToDelete;
    setInvoiceToDelete(undefined);
    try { await deleteInvoice(ownerId, invoiceNumber); setMessage("Invoice berhasil dihapus."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Invoice gagal dihapus."); }
  };
  return <>
    <div><h2 className="text-2xl font-bold">Rekap pemasukan</h2><p className="text-sm text-[#765e52]">Unduh pemasukan berdasarkan transaksi pembayaran yang berhasil diterima. Invoice yang belum dibayar tidak dihitung sebagai pemasukan.</p></div>
    <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Laporan tersedia</h3><span className="text-sm text-[#765e52]">{data.transactions.length} transaksi</span></div><div className="mt-4 space-y-3">{months.map((month) => <div key={month} className="flex flex-col items-start justify-between gap-3 rounded-xl bg-[#f8eee7] p-4 sm:flex-row sm:items-center"><div><b>{new Date(`${month}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</b><p className="mt-1 text-xs text-[#765e52]">{data.transactions.filter((transaction) => ["settlement", "capture", "confirmed"].includes(transaction.status) && transaction.paymentDate.startsWith(month)).length} transaksi berhasil</p></div><div className="flex w-full gap-2 sm:w-auto"><button onClick={() => download(month)} className="flex-1 rounded-lg border border-[#caa897] px-4 py-2 text-sm font-semibold hover:bg-[#ead0c2] sm:flex-none">Unduh CSV ↓</button></div></div>)}</div></section>
    <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-4 sm:p-5"><h3 className="text-lg font-bold">Invoice per penghuni</h3><div className="mt-4 space-y-3">    {data.invoices.map((invoice) => { const customer = invoiceCustomer(invoice.customerId); const room = invoiceRoom(invoice.roomId); return <div key={invoice.invoiceNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8eee7] p-4"><div><b>{invoice.invoiceNumber}</b><p className="text-xs text-[#765e52]">{customer ? `${customer.firstname} ${customer.lastname}` : "Penghuni"} · {room?.name || invoice.roomId}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void editInvoice(invoice.invoiceNumber, invoice.amount, invoice.dueDate)} className="rounded-lg border border-[#caa897] px-3 py-2 text-sm font-semibold hover:bg-[#ead0c2]">Edit</button><button type="button" onClick={() => void removeInvoice(invoice.invoiceNumber)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Hapus</button><button type="button" onClick={() => void downloadPdf(invoice.invoiceNumber)} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm font-semibold hover:bg-[#ead0c2]">Unduh PDF</button></div></div>; })}</div></section>
    {invoiceToDelete && <ConfirmDialog title="Hapus invoice?" message={`Invoice ${invoiceToDelete} akan dihapus secara permanen.`} confirmLabel="Hapus invoice" onClose={() => setInvoiceToDelete(undefined)} onConfirm={() => void confirmRemoveInvoice()} />}
  </>;
}
