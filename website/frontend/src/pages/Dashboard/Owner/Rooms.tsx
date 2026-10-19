import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { assignRoomCustomer, createRoom, deleteRoom, updateRoom } from "./api";
import type { OwnerData, Room } from "./types";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
type RoomForm = { name: string; type: string; price: string; withFurniture: boolean };
const emptyForm: RoomForm = { name: "", type: "small", price: "", withFurniture: false };
const money = (value: number) => `Rp. ${value.toLocaleString("id-ID")}`;
const furnitureFee = 100000;
const digits = (value: string) => value.replace(/\D/g, "");

export function OwnerRooms() {
  const { data, refresh, setMessage } = useOutletContext<Context>();
  const currentOwnerId = localStorage.getItem("userId");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Room>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Room>();
  const [renting, setRenting] = useState<Room>();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [rentalStartDate, setRentalStartDate] = useState("");
  const [monthlyDueDay, setMonthlyDueDay] = useState("1");
  const openEditor = (room?: Room) => {
    setEditing(room);
    setForm(room ? { name: room.name, type: room.type, price: String(Math.max(room.withFurniture ? room.price - furnitureFee : room.price, 0)), withFurniture: room.withFurniture } : emptyForm);
    setOpen(true);
  };
  const add = async (event: FormEvent) => {
    event.preventDefault();
    const ownerId = localStorage.getItem("userId");
    if (!ownerId) return;
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) await updateRoom(ownerId, editing.roomId, payload);
      else await createRoom(ownerId, payload);
      setOpen(false); setEditing(undefined); setForm(emptyForm); setMessage(editing ? "Kamar berhasil diperbarui." : "Kamar berhasil ditambahkan."); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Kamar gagal disimpan."); } finally { setSaving(false); }
  };
  const openRental = (room: Room) => {
    setRenting(room);
    setSelectedCustomerId(room.customerId || "");
    setRentalStartDate(room.rentalStartDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setMonthlyDueDay(String(room.monthlyDueDay || 1));
  };
  const saveRental = async () => {
    const ownerId = localStorage.getItem("userId");
    if (!ownerId || !renting) return;
    setSaving(true);
    try {
      await assignRoomCustomer(ownerId, renting.roomId, selectedCustomerId
        ? { customerId: selectedCustomerId, rentalStartDate, monthlyDueDay: Number(monthlyDueDay) }
        : { customerId: null });
      setRenting(undefined);
      setMessage(selectedCustomerId ? "Penghuni berhasil ditambahkan dan invoice pertama dibuat." : "Penghuni berhasil dilepas dari kamar.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Penghuni kamar gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (room: Room) => {
    if (!window.confirm(`Hapus ${room.name}? Kamar yang masih disewa harus dikosongkan terlebih dahulu.`)) return;
    const ownerId = localStorage.getItem("userId");
    if (!ownerId) return;
    setSaving(true);
    try {
      await deleteRoom(ownerId, room.roomId);
      setSelected(undefined);
      setMessage("Kamar berhasil dihapus.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kamar gagal dihapus.");
    } finally {
      setSaving(false);
    }
  };
  const customerName = (id?: string) => data.customers.find((customer) => customer.customerId === id)?.firstname || "Belum ada penghuni";
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Daftar kamar</h2><p className="text-sm text-[#765e52]">Kelola kamar, ukuran, harga, dan status penghuni.</p></div><button onClick={() => openEditor()} className="rounded-lg bg-[#694536] px-4 py-2.5 text-sm font-semibold text-white">+ Tambah kamar</button></div>
    <div className="mt-6 flex flex-wrap gap-3 text-sm"><div className="rounded-full bg-[#f8eee7] px-4 py-2">Semua <b>{data.rooms.length}</b></div><div className="rounded-full bg-[#d9ead7] px-4 py-2">Kosong <b>{data.rooms.filter((room) => !room.isOccupied).length}</b></div><div className="rounded-full bg-[#ead0c2] px-4 py-2">Terisi <b>{data.rooms.filter((room) => room.isOccupied).length}</b></div></div>
    {data.rooms.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[#caa897] bg-[#f8eee7] px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ead0c2] text-2xl">⌂</div><h3 className="mt-4 text-lg font-bold">Belum ada kamar</h3><p className="mx-auto mt-1 max-w-md text-sm text-[#765e52]">Tambahkan kamar pertama untuk mulai mengatur penghuni dan tagihan.</p><button onClick={() => openEditor()} className="mt-5 rounded-lg bg-[#694536] px-5 py-2.5 text-sm font-semibold text-white">Tambah kamar pertama</button></div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.rooms.map((room) => { const canManage = room.ownerId === currentOwnerId; return <article key={room.roomId} className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#765e52]">{room.roomId}</p><h3 className="text-xl font-bold">{room.name}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${room.isOccupied ? "bg-[#ead0c2]" : "bg-[#d9ead7]"}`}>{room.isOccupied ? "Terisi" : "Kosong"}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-[#765e52]">Ukuran</span><p className="font-semibold capitalize">{room.type}</p></div><div><span className="text-xs text-[#765e52]">Harga</span><p className="font-semibold">{money(room.price)}</p></div></div><p className="mt-4 text-sm text-[#765e52]">Penghuni</p><p className="font-semibold">{customerName(room.customerId)}</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setSelected(room)} className="rounded-lg border border-[#caa897] py-2 text-sm font-semibold hover:bg-[#f4e6dc]">Detail</button>{canManage && <button onClick={() => openEditor(room)} className="rounded-lg bg-[#694536] py-2 text-sm font-semibold text-white">Edit harga</button>}{canManage && <button onClick={() => openRental(room)} className="col-span-2 rounded-lg border border-[#caa897] py-2 text-sm font-semibold hover:bg-[#f4e6dc]">{room.customerId ? "Ganti penghuni" : "Sewakan ke customer"}</button>}</div>{!canManage && <p className="mt-3 text-center text-xs text-[#765e52]">Data owner lain · hanya dapat dilihat</p>}</article>; })}</div>}
    {open && <div className="fixed inset-0 z-10 overflow-y-auto bg-[#3e2f28]/40 p-4"><div className="grid min-h-full place-items-center"><form onSubmit={(event) => void add(event)} className="w-full max-w-md rounded-2xl bg-[#fffaf5] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? "Edit kamar" : "Tambah kamar"}</h2><button type="button" onClick={() => { setOpen(false); setEditing(undefined); }} aria-label="Tutup" className="text-xl">×</button></div><label className="mt-5 block text-sm font-semibold">Nama kamar<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" placeholder="Contoh: Kamar A1" /></label><label className="mt-3 block text-sm font-semibold">Ukuran<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></label><label className="mt-3 block text-sm font-semibold">Harga dasar per bulan<div className="mt-1 flex items-center rounded-lg border border-[#caa897] bg-white px-3 py-2"><span className="mr-2 text-[#765e52]">Rp</span><input required type="text" inputMode="numeric" value={Number(form.price || 0).toLocaleString("id-ID") === "0" && !form.price ? "" : Number(form.price.replace(/\D/g, "")).toLocaleString("id-ID")} onChange={(event) => setForm({ ...form, price: digits(event.target.value) })} className="w-full bg-transparent outline-none" placeholder="350.000" /></div></label><p className="mt-2 text-xs text-[#765e52]">Jika menggunakan furniture, otomatis ditambah Rp 100.000. Total: <b>{money(Number(form.price || 0) + (form.withFurniture ? furnitureFee : 0))}</b></p><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.withFurniture} onChange={(event) => setForm({ ...form, withFurniture: event.target.checked })} /> Dengan furniture (+ Rp 100.000)</label><button disabled={saving} className="mt-6 w-full rounded-lg bg-[#694536] px-4 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan kamar"}</button></form></div></div>}
    {renting && <div className="fixed inset-0 z-20 overflow-y-auto bg-[#3e2f28]/40 p-4"><div className="grid min-h-full place-items-center"><div className="w-full max-w-md rounded-2xl bg-[#fffaf5] p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs text-[#765e52]">Atur penyewaan</p><h2 className="text-2xl font-bold">{renting.name}</h2></div><button type="button" onClick={() => setRenting(undefined)} aria-label="Tutup" className="text-xl">×</button></div><p className="mt-2 text-sm text-[#765e52]">Pilih customer dan jadwal tagihan bulanan.</p><label className="mt-5 block text-sm font-semibold">Customer<select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value="">Kosongkan kamar</option>{data.customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.firstname} {customer.lastname}</option>)}</select></label>{selectedCustomerId && <><label className="mt-3 block text-sm font-semibold">Tanggal mulai sewa<input type="date" required value={rentalStartDate} onChange={(event) => setRentalStartDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold">Tanggal jatuh tempo bulanan<select value={monthlyDueDay} onChange={(event) => setMonthlyDueDay(event.target.value)} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2">{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><p className="mt-2 text-xs text-[#765e52]">Tanggal 29–31 otomatis menjadi hari terakhir pada bulan yang lebih pendek.</p></>}<div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={() => setRenting(undefined)} className="rounded-lg border border-[#caa897] py-2.5 font-semibold">Batal</button><button type="button" onClick={() => void saveRental()} disabled={saving} className="rounded-lg bg-[#694536] py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan penyewa"}</button></div></div></div></div>}
    {selected && <div className="fixed inset-0 z-10 overflow-y-auto bg-[#3e2f28]/40 p-4" onClick={() => setSelected(undefined)}><div className="grid min-h-full place-items-center"><div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#fffaf5] p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs text-[#765e52]">{selected.roomId}</p><h2 className="text-2xl font-bold">{selected.name}</h2></div><button type="button" onClick={() => setSelected(undefined)} aria-label="Tutup" className="text-xl">×</button></div><p className="mt-5 text-sm text-[#765e52]">Ukuran {selected.type} · {money(selected.price)} per bulan</p><p className="mt-2 text-sm">Status: <b>{selected.isOccupied ? "Terisi" : "Kosong"}</b></p><p className="mt-2 text-sm">Furniture: <b>{selected.withFurniture ? "Ya" : "Tidak"}</b></p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelected(undefined)} className="rounded-lg border border-[#caa897] py-2 font-semibold">Tutup</button><button type="button" disabled={saving || selected.isOccupied} onClick={() => void remove(selected)} className="rounded-lg bg-[#9b3d32] py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Hapus kamar</button></div></div></div>    </div>}
  </>;
}
