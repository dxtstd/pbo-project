import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, apiFetch, authHeaders } from "../../config";
import { Toast } from "../../components/Toast";
import { useAuthStore } from "../../stores/auth";
import { ConfirmDialog } from "../../components/ConfirmDialog";

type Owner = { ownerId: string; username: string; firstname: string; lastname: string; email: string; phoneNumber: string };
type Content = { siteName: string; heroTitle: string; heroDescription: string; facilitiesTitle: string; facilitiesDescription: string; contactTitle: string; contactDescription: string; location: string; whatsapp: string };
type Recipient = { id: string; label: string; phone: string };
type RecipientData = { status: { status?: string; pairedNumber?: string }; owners: Recipient[]; customers: Recipient[] };
type NotificationTemplate = { audience: "owner" | "customer"; event: string; header: string; content: string };
const emptyContent: Content = { siteName: "", heroTitle: "", heroDescription: "", facilitiesTitle: "", facilitiesDescription: "", contactTitle: "", contactDescription: "", location: "", whatsapp: "" };
const emptyOwner = { username: "", firstname: "", lastname: "", email: "", phoneNumber: "", password: "" };

export function AdminDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const adminUser = useAuthStore((state) => state.user);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [content, setContent] = useState<Content>(emptyContent);
  const [ownerForm, setOwnerForm] = useState(emptyOwner);
  const [editing, setEditing] = useState<string>();
  const [message, setMessage] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"owner" | "reset">();
  const [ownerToDelete, setOwnerToDelete] = useState<string>();
  const [recipients, setRecipients] = useState<RecipientData>({ status: {}, owners: [], customers: [] });
  const [testRecipient, setTestRecipient] = useState("");
  const [testMessage, setTestMessage] = useState("Halo dari Kost Lorem Ipsum. Ini adalah pesan testing notifikasi WhatsApp.");
  const [testEvent, setTestEvent] = useState("invoice_due");
  const [testAudience, setTestAudience] = useState<"owner" | "customer">("customer");
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);

  const load = useCallback(async () => {
    const [ownerResponse, contentResponse, recipientResponse, templateResponse] = await Promise.all([
      apiFetch(`${API_URL}/admin/owners`, { headers: authHeaders() }),
      apiFetch(`${API_URL}/admin/site-content`, { headers: authHeaders() }),
      apiFetch(`${API_URL}/admin/notification/recipients`, { headers: authHeaders() }),
      apiFetch(`${API_URL}/admin/notification/templates`, { headers: authHeaders() }),
    ]);
    if (!ownerResponse.ok || !contentResponse.ok || !recipientResponse.ok || !templateResponse.ok) { navigate("/login"); return; }
    setOwners((await ownerResponse.json() as { owners: Owner[] }).owners);
    setContent((await contentResponse.json() as { content: Content }).content || emptyContent);
    setRecipients(await recipientResponse.json() as RecipientData);
    setNotificationTemplates((await templateResponse.json() as { templates: NotificationTemplate[] }).templates);
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const saveOwner = async () => {
    const response = await apiFetch(`${API_URL}/admin/owners${editing ? `/${editing}` : ""}`, {
      method: editing ? "PATCH" : "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify(ownerForm),
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "Owner berhasil disimpan." : result.message || "Owner gagal disimpan.");
    if (response.ok) { setOwnerForm(emptyOwner); setEditing(undefined); await load(); }
  };

  const removeOwner = async (ownerId: string) => {
    const response = await apiFetch(`${API_URL}/admin/owners/${ownerId}`, { method: "DELETE", headers: authHeaders() });
    setMessage(response.ok ? "Owner berhasil dihapus." : "Owner gagal dihapus.");
    if (response.ok) await load();
  };

  const saveContent = async () => {
    const response = await apiFetch(`${API_URL}/admin/site-content`, {
      method: "PUT", headers: { ...authHeaders(), "content-type": "application/json" }, body: JSON.stringify(content),
    });
    setMessage(response.ok ? "Konten landing page berhasil disimpan." : "Konten landing page gagal disimpan.");
  };

  const resetApplication = async () => {
    setIsResetting(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/reset`, {
        method: "POST", headers: { ...authHeaders(), "content-type": "application/json" }, body: JSON.stringify({ confirmation: "RESET-ALL" }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(response.ok ? "Semua data aplikasi berhasil dihapus." : result.message || "Reset data gagal.");
      if (response.ok) { setOwners([]); setContent(emptyContent); setOwnerForm(emptyOwner); setEditing(undefined); await load(); }
    } catch { setMessage("Reset data gagal karena server tidak dapat dihubungi."); }
    finally { setIsResetting(false); }
  };

  const sendNotificationTest = async () => {
    const response = await apiFetch(`${API_URL}/admin/notification/test`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ recipient: testRecipient, message: testMessage }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "Notifikasi testing berhasil dikirim." : result.message || "Notifikasi testing gagal dikirim.");
  };
  const sendEventTest = async () => {
    const audience = ["invoice_created", "invoice_due"].includes(testEvent) ? "customer" : testEvent === "payment_received" ? testAudience : "owner";
    const response = await apiFetch(`${API_URL}/admin/notification/test-event`, {
      method: "POST", headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ recipient: testRecipient, event: testEvent, audience }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "Simulasi notifikasi berhasil dikirim." : result.message || "Simulasi notifikasi gagal dikirim.");
  };

  const saveNotificationTemplates = async () => {
    const response = await apiFetch(`${API_URL}/admin/notification/templates`, {
      method: "PUT",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ templates: Object.fromEntries(notificationTemplates.map((template) => [`${template.audience}:${template.event}`, { header: template.header, content: template.content }])) }),
    });
    setMessage(response.ok ? "Template notifikasi berhasil disimpan." : "Template notifikasi gagal disimpan.");
  };

  const ownerFields = ["username", "firstname", "lastname", "email", "phoneNumber", "password"] as const;
  const contentFields = [["siteName", "Nama situs"], ["heroTitle", "Judul utama"], ["heroDescription", "Deskripsi utama"], ["facilitiesTitle", "Judul fasilitas"], ["facilitiesDescription", "Deskripsi fasilitas"], ["contactTitle", "Judul kontak"], ["contactDescription", "Deskripsi kontak"], ["location", "Lokasi"], ["whatsapp", "WhatsApp"]] as const;
  const adminUsername = adminUser?.username || "admin";

  return (
    <main className="min-h-screen bg-[#efe2d6] px-4 py-6 text-[#3e2f28] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-[#765e52]">CMS Admin</p><h1 className="font-serif text-3xl font-bold">Kost Lorem Ipsum</h1></div>
          <div className="flex items-center gap-3"><div className="text-right"><p className="font-semibold">{adminUsername}</p><p className="text-sm text-[#765e52]">{adminUser?.email || "Email admin belum diatur"}</p></div><div className="grid h-11 w-11 place-items-center rounded-full bg-[#694536] font-bold text-white">{adminUsername.charAt(0).toUpperCase()}</div><button onClick={() => { logout(); navigate("/login", { replace: true }); }} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm">Keluar</button></div>
        </header>

        <section className="mt-8 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Kelola owner</h2><p className="text-sm text-[#765e52]">Tambahkan dan kelola akun pemilik kost.</p></div><button onClick={() => { setEditing(undefined); setOwnerForm(emptyOwner); }} className="rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white">Owner baru</button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{owners.map((owner) => <article key={owner.ownerId} className="rounded-xl bg-[#f8eee7] p-4"><p className="text-xs text-[#765e52]">{owner.ownerId} · @{owner.username}</p><h3 className="font-bold">{owner.firstname} {owner.lastname}</h3><p className="text-sm text-[#765e52]">{owner.email} · {owner.phoneNumber}</p><div className="mt-3 flex gap-2"><button onClick={() => { setEditing(owner.ownerId); setOwnerForm({ username: owner.username, firstname: owner.firstname, lastname: owner.lastname, email: owner.email, phoneNumber: owner.phoneNumber, password: "" }); }} className="rounded-lg bg-[#694536] px-3 py-1.5 text-xs font-semibold text-white">Edit</button><button onClick={() => { setOwnerToDelete(owner.ownerId); setConfirmAction("owner"); }} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700">Hapus</button></div></article>)}</div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">{ownerFields.map((field) => <label key={field} className="text-sm font-semibold">{field}<input type={field === "password" ? "password" : field === "email" ? "email" : "text"} required={!editing || field !== "password"} value={ownerForm[field]} onChange={(event) => setOwnerForm({ ...ownerForm, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label>)}<button onClick={() => void saveOwner()} className="rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white md:col-span-2">{editing ? "Simpan owner" : "Tambah owner"}</button></div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7">
          <h2 className="text-xl font-bold">Testing notifikasi WhatsApp</h2>
          <p className="mt-1 text-sm text-[#765e52]">Status: <b>{recipients.status.status || "tidak diketahui"}</b>{recipients.status.pairedNumber ? ` · Terhubung: ${recipients.status.pairedNumber}` : ""}</p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold">Penerima<select value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value="">Pilih nomor customer atau owner</option><optgroup label="Customer">{recipients.customers.map((recipient) => <option key={`customer-${recipient.id}`} value={recipient.phone}>{recipient.label} · {recipient.phone}</option>)}</optgroup><optgroup label="Owner">{recipients.owners.map((recipient) => <option key={`owner-${recipient.id}`} value={recipient.phone}>{recipient.label} · {recipient.phone}</option>)}</optgroup></select></label>
            <label className="text-sm font-semibold">Pesan<textarea rows={4} value={testMessage} onChange={(event) => setTestMessage(event.target.value)} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label>
            <button onClick={() => void sendNotificationTest()} disabled={!testRecipient || !testMessage.trim()} className="rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Kirim pesan custom</button>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><select value={testEvent} onChange={(event) => setTestEvent(event.target.value)} className="rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value="invoice_created">Test invoice baru</option><option value="invoice_due">Test H-7 / due date</option><option value="cash_requested">Test request cash</option><option value="payment_received">Test transaksi berhasil</option><option value="extension_requested">Test request perpanjangan</option></select>{testEvent === "payment_received" && <select value={testAudience} onChange={(event) => setTestAudience(event.target.value as "owner" | "customer")} className="rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value="customer">Customer</option><option value="owner">Owner</option></select>}<button onClick={() => void sendEventTest()} disabled={!testRecipient} className="rounded-lg border border-[#694536] px-4 py-2 font-semibold text-[#694536] disabled:opacity-50">Kirim simulasi event</button></div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7">
          <h2 className="text-xl font-bold">Template pesan otomatis</h2>
          <p className="mt-1 text-sm text-[#765e52]">Atur pesan untuk invoice pertama, H-7/jatuh tempo, cash, pembayaran berhasil, dan permintaan perpanjangan kamar.</p>
          <p className="mt-2 rounded-lg bg-[#f8eee7] p-3 text-xs text-[#765e52]">Format pesan: %name_business%<br />=============<br />%header%<br /><br />%message%<br /><br />Placeholder isi: %customer_name% %owner_name% %payment% %invoice_number% %due_date% %days_before_due% %expires_at% %payment_method% %room_name% %months% %dashboard_link%</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">{(["customer", "owner"] as const).map((audience) => <div key={audience} className="rounded-xl border border-[#d7b9a9] p-4"><h3 className="text-lg font-bold">{audience === "customer" ? "Template Customer" : "Template Owner"}</h3><div className="mt-3 grid gap-4">{notificationTemplates.filter((template) => template.audience === audience).map((template) => <div key={`${template.audience}-${template.event}`}><label className="text-sm font-semibold">{({ invoice_created: "Invoice pertama", invoice_due: "H-7 / jatuh tempo", cash_requested: "Request cash", payment_received: "Transaksi berhasil", extension_requested: "Request perpanjangan kamar" } as Record<string, string>)[template.event] || template.event}<input value={template.header} placeholder="Header pesan" onChange={(event) => setNotificationTemplates(notificationTemplates.map((item) => item.audience === template.audience && item.event === template.event ? { ...item, header: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2 font-normal" /><textarea rows={4} value={template.content} onChange={(event) => setNotificationTemplates(notificationTemplates.map((item) => item.audience === template.audience && item.event === template.event ? { ...item, content: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2 font-normal" /></label></div>)}</div></div>)}</div>
          <button onClick={() => void saveNotificationTemplates()} className="mt-4 rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white">Simpan template notifikasi</button>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-7"><h2 className="text-xl font-bold">CMS landing page</h2><p className="text-sm text-[#765e52]">Edit teks yang tampil di halaman depan.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{contentFields.map(([field, label]) => <label key={field} className="text-sm font-semibold">{label}{field.toLowerCase().includes("description") ? <textarea rows={3} value={content[field]} onChange={(event) => setContent({ ...content, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /> : <input value={content[field]} onChange={(event) => setContent({ ...content, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" />}</label>)}<button onClick={() => void saveContent()} className="rounded-lg bg-[#694536] px-4 py-2 font-semibold text-white md:col-span-2">Simpan konten landing</button></div></section>
        <section className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-5 sm:p-7"><h2 className="text-xl font-bold text-red-900">Zona berbahaya</h2><p className="mt-1 text-sm text-red-800">Reset akan menghapus seluruh data aplikasi secara permanen. Kredensial admin dari environment tetap aman.</p><button onClick={() => setConfirmAction("reset")} disabled={isResetting} className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">{isResetting ? "Menghapus..." : "Reset semua data"}</button></section>
        {message && <Toast message={message} onClose={() => setMessage("")} />}
        {confirmAction === "owner" && ownerToDelete && <ConfirmDialog title="Hapus owner?" message="Owner akan dihapus secara permanen." confirmLabel="Hapus owner" onClose={() => { setConfirmAction(undefined); setOwnerToDelete(undefined); }} onConfirm={() => { const id = ownerToDelete; setConfirmAction(undefined); setOwnerToDelete(undefined); void removeOwner(id); }} />}
        {confirmAction === "reset" && <ConfirmDialog title="Reset seluruh data?" message="Semua owner, customer, kamar, invoice, transaksi, notifikasi, dan konten CMS akan dihapus permanen. Kredensial admin tetap aman." confirmLabel="Reset semua data" confirmationWord="RESET-ALL" onClose={() => setConfirmAction(undefined)} onConfirm={() => { setConfirmAction(undefined); void resetApplication(); }} />}
      </div>
    </main>
  );
}
