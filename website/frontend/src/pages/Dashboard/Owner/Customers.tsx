import { useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { createCustomer, deleteCustomer, updateCustomer } from "./api";
import type { OwnerData } from "./types";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
type CustomerForm = { customerId: string; username: string; firstname: string; lastname: string; phoneNumber: string; password: string };
const emptyForm: CustomerForm = { customerId: "", username: "", firstname: "", lastname: "", phoneNumber: "", password: "" };

export function OwnerCustomers() {
  const { data, refresh, setMessage } = useOutletContext<Context>();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const openForm = (customer?: OwnerData["customers"][number]) => {
    setEditing(customer?.customerId);
    setForm(customer ? { customerId: customer.customerId, username: customer.username || "", firstname: customer.firstname, lastname: customer.lastname, phoneNumber: customer.phoneNumber || "", password: "" } : emptyForm);
    setOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const ownerId = localStorage.getItem("userId");
    if (!ownerId) return;
    setSaving(true);
    try {
      if (editing) await updateCustomer(ownerId, editing, form);
      else await createCustomer(ownerId, form);
      setOpen(false); setEditing(undefined); setForm(emptyForm); setMessage(editing ? "Customer berhasil diperbarui." : "Customer berhasil ditambahkan."); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Customer gagal disimpan."); } finally { setSaving(false); }
  };
  const remove = async (customerId: string) => {
    const ownerId = localStorage.getItem("userId");
    if (!ownerId || !window.confirm("Hapus customer ini?")) return;
    try { await deleteCustomer(ownerId, customerId); setMessage("Customer berhasil dihapus."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Customer gagal dihapus."); }
  };
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Daftar customer</h2><p className="text-sm text-[#765e52]">Kelola data customer yang menyewa kost Anda.</p></div><button type="button" onClick={() => openForm()} className="rounded-lg bg-[#694536] px-4 py-2.5 text-sm font-semibold text-white">+ Tambah customer</button></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.customers.map((customer) => <article key={customer.customerId} className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5"><p className="text-xs text-[#765e52]">{customer.customerId}</p><h3 className="mt-1 text-lg font-bold">{customer.firstname} {customer.lastname}</h3><p className="mt-2 text-sm text-[#765e52]">@{customer.username}</p><p className="text-sm text-[#765e52]">{customer.phoneNumber}</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => openForm(customer)} className="rounded-lg bg-[#694536] py-2 text-sm font-semibold text-white">Edit</button><button type="button" onClick={() => void remove(customer.customerId)} className="rounded-lg border border-red-300 py-2 text-sm font-semibold text-red-700">Hapus</button></div></article>)}</div>
    {open && <div className="fixed inset-0 z-20 overflow-y-auto bg-[#3e2f28]/40 p-4"><div className="grid min-h-full place-items-center"><form onSubmit={(event) => void save(event)} className="w-full max-w-md rounded-2xl bg-[#fffaf5] p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? "Edit customer" : "Tambah customer"}</h2><button type="button" onClick={() => setOpen(false)} className="text-xl">×</button></div>{(["customerId", "username", "firstname", "lastname", "phoneNumber"] as const).map((field) => <label key={field} className="mt-3 block text-sm font-semibold">{field === "customerId" ? "ID customer" : field === "phoneNumber" ? "Nomor WhatsApp" : field}<input required value={form[field]} disabled={field === "customerId" && Boolean(editing)} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label>)}<label className="mt-3 block text-sm font-semibold">Password {editing && <span className="font-normal text-[#765e52]">(kosongkan jika tidak berubah)</span>}<input required={!editing} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label><button disabled={saving} className="mt-6 w-full rounded-lg bg-[#694536] py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan customer"}</button></form></div></div>}
  </>;
}
