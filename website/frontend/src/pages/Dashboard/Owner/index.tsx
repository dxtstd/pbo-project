import { useEffect, useState } from "react";
import { API_URL } from "../../../config";

type Room = { roomId: string; name: string; customerId?: string; isOccupied: boolean };
type OwnerData = { rooms: Room[]; customers: { customerId: string; firstname: string; lastname: string }[]; cashPayments?: { transactionId: string; totalAmount: number; invoiceNumber?: string }[] };

const demo: OwnerData = { rooms: [{ roomId: "R01", name: "Kamar 01", customerId: "C01", isOccupied: true }, { roomId: "R02", name: "Kamar 02", customerId: "C02", isOccupied: true }, { roomId: "R03", name: "Kamar 03", isOccupied: false }], customers: [{ customerId: "C01", firstname: "Bambang", lastname: "" }, { customerId: "C02", firstname: "Mulyono", lastname: "" }] };

export function OwnerDashboard() {
  const [data, setData] = useState(demo);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch(`${API_URL}/dashboard/owner/${localStorage.getItem("ownerId") || "demo-owner"}`).then((response) => response.ok ? response.json() : Promise.reject()).then(setData).catch(() => undefined); }, []);
  const customerName = (id?: string) => data.customers.find((customer) => customer.customerId === id)?.firstname || "Kosong";
  const confirmCash = async (transactionId: string) => {
    const response = await fetch(`${API_URL}/payment/cash/${transactionId}/confirm`, { method: "POST" });
    if (response.ok) {
      setData({ ...data, cashPayments: data.cashPayments?.filter((payment) => payment.transactionId !== transactionId) });
      setMessage("Pembayaran cash dikonfirmasi.");
    }
  };
  return <main className="min-h-[calc(100dvh-76px)] bg-[#efe2d6] px-4 py-6 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="mb-6"><p className="text-sm text-[#765e52]">Dashboard Pemilik</p><h1 className="font-serif text-3xl font-bold">Ringkasan kost</h1></header><section><h2 className="mb-3 text-lg font-bold">Daftar penghuni</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.rooms.map((room) => <article key={room.roomId} className="rounded-xl border border-[#d1b4a4] bg-[#fffaf5] p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{room.name}</h3><p className="text-sm text-[#765e52]">Nama: {customerName(room.customerId)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${room.isOccupied ? "bg-[#ead0c2]" : "bg-[#d9ead7]"}`}>{room.isOccupied ? "Terisi" : "Kosong"}</span></div>{room.isOccupied && <button onClick={() => setMessage(`Status ${room.name} siap diperbarui.`)} className="mt-4 w-full rounded-lg border border-[#caa897] py-2 text-sm font-semibold hover:bg-[#f4e6dc]">Update Status</button>}</article>)}</div></section><section className="mt-8"><h2 className="mb-3 text-lg font-bold">Cash menunggu konfirmasi</h2><div className="grid gap-3 sm:grid-cols-2">{(data.cashPayments || []).map((payment) => <div key={payment.transactionId} className="flex items-center justify-between gap-3 rounded-xl border border-[#d1b4a4] bg-[#fffaf5] p-4"><span>{payment.invoiceNumber || payment.transactionId}<br /><b>Rp. {payment.totalAmount.toLocaleString("id-ID")}</b></span><button onClick={() => void confirmCash(payment.transactionId)} className="rounded-lg bg-[#694536] px-3 py-2 text-xs font-semibold text-white">Konfirmasi</button></div>)}{!data.cashPayments?.length && <p className="text-sm text-[#765e52]">Tidak ada pembayaran cash yang menunggu.</p>}</div></section><section className="mt-8"><h2 className="mb-3 text-lg font-bold">Daftar rekap</h2><div className="grid gap-4 sm:grid-cols-2"><button className="rounded-xl border border-[#d1b4a4] bg-[#fffaf5] p-5 text-left hover:bg-[#f4e6dc]"><b>September</b><span className="mt-2 block text-sm text-[#765e52]">Unduh rekap pembayaran</span></button><button className="rounded-xl border border-[#d1b4a4] bg-[#fffaf5] p-5 text-left hover:bg-[#f4e6dc]"><b>Oktober</b><span className="mt-2 block text-sm text-[#765e52]">Unduh rekap pembayaran</span></button></div></section>{message && <p className="mt-5 rounded-lg bg-[#ead0c2] p-3 text-sm">{message}</p>}</div></main>;
}
