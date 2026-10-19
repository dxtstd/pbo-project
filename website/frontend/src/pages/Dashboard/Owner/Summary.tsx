import { Link, useOutletContext } from "react-router-dom";
import type { OwnerData } from "./types";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };

export function OwnerSummary() {
  const { data } = useOutletContext<Context>();
  const occupied = data.rooms.filter((room) => room.isOccupied).length;
  const pending = data.cashPayments?.length || 0;
  return <>
    <div className="mb-6"><h2 className="text-2xl font-bold">Ringkasan kost</h2><p className="text-sm text-[#765e52]">Pantau kondisi kost dan pekerjaan yang perlu ditangani.</p></div>
    <section className="grid gap-4 sm:grid-cols-3">
      <Link to="/dashboard/owner/kamar" className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#765e52]">Total kamar</p><p className="mt-2 text-3xl font-bold">{data.rooms.length}</p><p className="mt-1 text-xs text-[#765e52]">Buka daftar kamar →</p></Link>
      <Link to="/dashboard/owner/kamar" className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#765e52]">Kamar terisi</p><p className="mt-2 text-3xl font-bold">{occupied}</p><p className="mt-1 text-xs text-[#765e52]">{Math.max(data.rooms.length - occupied, 0)} kamar tersedia</p></Link>
      <Link to="/dashboard/owner/pembayaran" className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#765e52]">Cash menunggu</p><p className="mt-2 text-3xl font-bold">{pending}</p><p className="mt-1 text-xs text-[#765e52]">Lihat pembayaran →</p></Link>
    </section>
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-6"><h3 className="text-lg font-bold">Mulai dari sini</h3><p className="mt-1 text-sm text-[#765e52]">Kelola operasional kost dengan cepat.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link to="/dashboard/owner/kamar" className="rounded-xl bg-[#f8eee7] p-4 text-sm font-semibold hover:bg-[#ead0c2]">Kelola kamar <span className="block mt-1 text-xs font-normal text-[#765e52]">Tambah atau lihat kamar</span></Link><Link to="/dashboard/owner/pembayaran" className="rounded-xl bg-[#f8eee7] p-4 text-sm font-semibold hover:bg-[#ead0c2]">Tinjau pembayaran <span className="block mt-1 text-xs font-normal text-[#765e52]">Konfirmasi cash masuk</span></Link></div></div>
      <div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-6"><h3 className="text-lg font-bold">Status hari ini</h3><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-[#ead0c2] pb-3"><span className="text-[#765e52]">Penghuni aktif</span><b>{data.customers.length}</b></div><div className="flex justify-between border-b border-[#ead0c2] pb-3"><span className="text-[#765e52]">Invoice tercatat</span><b>{data.invoices.length}</b></div><div className="flex justify-between"><span className="text-[#765e52]">Perlu tindakan</span><b>{pending} pembayaran</b></div></div></div>
    </section>
  </>;
}
