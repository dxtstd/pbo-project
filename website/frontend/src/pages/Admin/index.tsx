import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, authHeaders } from "../../config";
import { Toast } from "../../components/Toast";
import { useAuthStore } from "../../stores/auth";

type Owner = { ownerId: string; username: string; firstname: string; lastname: string; email: string; phoneNumber: string };
type Content = { siteName: string; heroTitle: string; heroDescription: string; facilitiesTitle: string; facilitiesDescription: string; contactTitle: string; contactDescription: string; location: string; whatsapp: string };
const emptyContent: Content = { siteName: "", heroTitle: "", heroDescription: "", facilitiesTitle: "", facilitiesDescription: "", contactTitle: "", contactDescription: "", location: "", whatsapp: "" };

export function AdminDashboard() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.logout);
  const adminUser = useAuthStore((state) => state.user);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [content, setContent] = useState<Content>(emptyContent);
  const [ownerForm, setOwnerForm] = useState({ username: "", firstname: "", lastname: "", email: "", phoneNumber: "", password: "" });
  const [editing, setEditing] = useState<string>();
  const [message, setMessage] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const load = useCallback(async () => {
    const [ownerResponse, contentResponse] = await Promise.all([
      fetch(`${API_URL}/admin/owners`, { headers: authHeaders() }),
      fetch(`${API_URL}/admin/site-content`, { headers: authHeaders() }),
    ]);
    if (!ownerResponse.ok || !contentResponse.ok) { navigate("/login"); return; }
    setOwners((await ownerResponse.json() as { owners: Owner[] }).owners);
    setContent((await contentResponse.json() as { content: Content }).content || emptyContent);
  }, [navigate]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const saveOwner = async () => {
    const response = await fetch(`${API_URL}/admin/owners${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { ...authHeaders(), "content-type": "application/json" }, body: JSON.stringify(ownerForm) });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "Owner berhasil disimpan." : result.message || "Owner gagal disimpan.");
    if (response.ok) { setOwnerForm({ username: "", firstname: "", lastname: "", email: "", phoneNumber: "", password: "" }); setEditing(undefined); await load(); }
  };
  const removeOwner = async (ownerId: string) => {
    if (!window.confirm("Hapus owner ini?")) return;
    const response = await fetch(`${API_URL}/admin/owners/${ownerId}`, { method: "DELETE", headers: authHeaders() });
    setMessage(response.ok ? "Owner berhasil dihapus." : "Owner gagal dihapus.");
    if (response.ok) await load();
  };
  const saveContent = async () => {
    const response = await fetch(`${API_URL}/admin/site-content`, { method: "PUT", headers: { ...authHeaders(), "content-type": "application/json" }, body: JSON.stringify(content) });
    setMessage(response.ok ? "Konten landing page berhasil disimpan." : "Konten landing page gagal disimpan.");
  };
  const resetApplication = async () => {
    if (!window.confirm("PERINGATAN: tindakan ini akan menghapus semua owner, customer, kamar, invoice, transaksi, notifikasi, dan konten CMS secara permanen. Lanjutkan?")) return;
    const confirmation = window.prompt("Konfirmasi kedua: ketik RESET-ALL untuk menghapus seluruh data aplikasi.");
    if (confirmation !== "RESET-ALL") {
      setMessage("Reset dibatalkan. Kata konfirmasi tidak sesuai.");
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`${API_URL}/admin/reset`, {
        method: "POST",
        headers: { ...authHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(response.ok ? "Semua data aplikasi berhasil dihapus." : result.message || "Reset data gagal.");
      if (response.ok) {
        setOwners([]);
        setContent(emptyContent);
        setOwnerForm({ username: "", firstname: "", lastname: "", email: "", phoneNumber: "", password: "" });
        setEditing(undefined);
      }
    } catch {
      setMessage("Reset data gagal karena server tidak dapat dihubungi.");
    } finally {
      setIsResetting(false);
    }
  };
  const logout = () => { clearAuth(); navigate("/login", { replace: true }); };
  const ownerFields = ["username", "firstname", "lastname", "email", "phoneNumber", "password"] as const;
  const contentFields = [["siteName", "Nama situs"], ["heroTitle", "Judul utama"], ["heroDescription", "Deskripsi utama"], ["facilitiesTitle", "Judul fasilitas"], ["facilitiesDescription", "Deskripsi fasilitas"], ["contactTitle", "Judul kontak"], ["contactDescription", "Deskripsi kontak"], ["location", "Lokasi"], ["whatsapp", "WhatsApp"]] as const;
  const adminUsername = adminUser?.username || "admin";
  const adminInitial = adminUsername.charAt(0).toUpperCase();
  return <main className="min-h-screen bg-[#efe2d6] px-4 py-6 text-[#3e2f28] sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-[#765e52]">CMS Admin</p><h1 className="font-serif text-3xl font-bold">Kost Lorem Ipsum</h1></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-semibold">{adminUsername}</p><p className="text-sm text-[#765e52]">{adminUser?.email || "Email admin belum diatur"}</p></div><div className="grid h-11 w-11 place-items-center rounded-full bg-[#694536] font-bold text-white">{adminInitial}</div><button onClick={logout} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm">Keluar</button></div></header><section className="mt-8 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Kelola owner</h2><p className="text-sm text-[#765e52]">Tambahkan dan kelola akun pemilik kost.</p></div><button onClick={() => { setEditing(undefined); setOwnerForm({ username: "", firstname: "", lastname: "", email: "", phoneNumber: "", password: "" }); }} className="rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white">Owner baru</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{owners.map((owner) => <article key={owner.ownerId} className="rounded-xl bg-[#f8eee7] p-4"><p className="text-xs text-[#765e52]">{owner.ownerId} · @{owner.username}</p><h3 className="font-bold">{owner.firstname} {owner.lastname}</h3><p className="text-sm text-[#765e52]">{owner.email} · {owner.phoneNumber}</p><div className="mt-3 flex gap-2"><button onClick={() => { setEditing(owner.ownerId); setOwnerForm({ username: owner.username, firstname: owner.firstname, lastname: owner.lastname, email: owner.email, phoneNumber: owner.phoneNumber, password: "" }); }} className="rounded-lg bg-[#694536] px-3 py-1.5 text-xs font-semibold text-white">Edit</button><button onClick={() => void removeOwner(owner.ownerId)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700">Hapus</button></div></article>)}</div><div className="mt-6 grid gap-3 md:grid-cols-2">{ownerFields.map((field) => <label key={field} className="text-sm font-semibold">{field}<input type={field === "password" ? "password" : field === "email" ? "email" : "text"} required={!editing || field !== "password"} value={ownerForm[field]} onChange={(event) => setOwnerForm({ ...ownerForm, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label>)}<button onClick={() => void saveOwner()} className="rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white md:col-span-2">{editing ? "Simpan owner" : "Tambah owner"}</button></div></section><section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7"><h2 className="text-xl font-bold">CMS landing page</h2><p className="text-sm text-[#765e52]">Edit teks yang tampil di halaman depan.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{contentFields.map(([field, label]) => <label key={field} className="text-sm font-semibold">{label}{field.toLowerCase().includes("description") ? <textarea rows={3} value={content[field]} onChange={(event) => setContent({ ...content, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /> : <input value={content[field]} onChange={(event) => setContent({ ...content, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" />}</label>)}<button onClick={() => void saveContent()} className="rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white md:col-span-2">Simpan konten landing</button></div></section><section className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-5 sm:p-7"><h2 className="text-xl font-bold text-red-900">Zona berbahaya</h2><p className="mt-1 text-sm text-red-800">Reset akan menghapus seluruh data aplikasi secara permanen. Kredensial admin dari environment tetap aman.</p><button onClick={() => void resetApplication()} disabled={isResetting} className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">{isResetting ? "Menghapus..." : "Reset semua data"}</button></section>{message && <Toast message={message} onClose={() => setMessage("")} />}</div></main>;
}
