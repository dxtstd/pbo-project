import { useOutletContext } from "react-router-dom";
import type { OwnerData } from "./types";
import { downloadInvoice } from "../../../utils/invoiceGenerator";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
const months = ["2026-10", "2026-09", "2026-08"];

export function OwnerReports() {
  const { data, setMessage } = useOutletContext<Context>();
  const download = (month: string) => {
    const rows = data.invoices.filter((invoice) => invoice.dueDate.startsWith(month));
    const csv = [["Nomor invoice", "Nominal", "Status", "Jatuh tempo"], ...rows.map((invoice) => [invoice.invoiceNumber, String(invoice.amount), invoice.status, invoice.dueDate])].map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `rekap-${month}.csv`; link.click(); URL.revokeObjectURL(url);
    setMessage(`Rekap ${month} berhasil diunduh.`);
  };
  const invoiceCustomer = (customerId: string) => data.customers.find((customer) => customer.customerId === customerId);
  const invoiceRoom = (roomId: string) => data.rooms.find((room) => room.roomId === roomId);
  return <>
    <div><h2 className="text-2xl font-bold">Rekap bulanan</h2><p className="text-sm text-[#765e52]">Unduh laporan invoice dan status pembayaran kost.</p></div>
    <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Laporan tersedia</h3><span className="text-sm text-[#765e52]">{data.invoices.length} invoice</span></div><div className="mt-4 space-y-3">{months.map((month) => <div key={month} className="flex flex-col items-start justify-between gap-3 rounded-xl bg-[#f8eee7] p-4 sm:flex-row sm:items-center"><div><b>{new Date(`${month}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</b><p className="mt-1 text-xs text-[#765e52]">{data.invoices.filter((invoice) => invoice.dueDate.startsWith(month)).length} invoice pada periode ini</p></div><div className="flex w-full gap-2 sm:w-auto"><button onClick={() => download(month)} className="flex-1 rounded-lg border border-[#caa897] px-4 py-2 text-sm font-semibold hover:bg-[#ead0c2] sm:flex-none">Unduh CSV ↓</button></div></div>)}</div></section>
    <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-4 sm:p-5"><h3 className="text-lg font-bold">Invoice per penghuni</h3><div className="mt-4 space-y-3">{data.invoices.map((invoice) => { const customer = invoiceCustomer(invoice.customerId); const room = invoiceRoom(invoice.roomId); return <div key={invoice.invoiceNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8eee7] p-4"><div><b>{invoice.invoiceNumber}</b><p className="text-xs text-[#765e52]">{customer ? `${customer.firstname} ${customer.lastname}` : "Penghuni"} · {room?.name || invoice.roomId}</p></div><button type="button" onClick={() => downloadInvoice({ ...invoice, customerName: customer ? `${customer.firstname} ${customer.lastname}` : undefined, roomName: room?.name })} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm font-semibold hover:bg-[#ead0c2]">Unduh invoice</button></div>; })}</div></section>
  </>;
}
