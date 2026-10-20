import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import QRCode from "qrcode";
import { API_URL, apiFetch, authHeaders } from "../../../config";
import type { OwnerData } from "./types";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type Context = { data: OwnerData; refresh: () => Promise<void>; setMessage: (message: string) => void };
type NotificationStatus = { status: string; qr?: string; pairedNumber?: string; ownerPhone?: string; notificationPhone?: string; notificationEnabled?: boolean };

export function OwnerSettings() {
  const { setMessage } = useOutletContext<Context>();
  const [status, setStatus] = useState<NotificationStatus>();
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const qrCanvas = useRef<HTMLCanvasElement>(null);
  const ownerId = localStorage.getItem("userId");

  useEffect(() => {
    const checkStatus = () => {
      void apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification`, { headers: authHeaders() })
        .then(async (response) => {
          if (response.ok) {
            const nextStatus = await response.json() as NotificationStatus;
            setStatus(nextStatus);
            setNotificationPhone((current) => current || nextStatus.notificationPhone || nextStatus.ownerPhone || "");
          }
          else setMessage("Status WhatsApp tidak dapat dimuat.");
          setLoading(false);
        })
        .catch(() => {
          setMessage("Notification service tidak tersedia.");
          setLoading(false);
        });
    };
    const initialCheck = window.setTimeout(checkStatus, 0);
    const timer = window.setInterval(checkStatus, 3000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [ownerId, setMessage]);

  useEffect(() => {
    if (!status?.qr || !qrCanvas.current) return;
    void QRCode.toCanvas(qrCanvas.current, status.qr, {
      width: 260,
      margin: 2,
      color: { dark: "#3e2f28", light: "#fffaf5" },
    }).catch(() => setMessage("QR WhatsApp gagal dibuat."));
  }, [status?.qr, setMessage]);

  const startPairing = async () => {
    if (!ownerId) return;
    setLoading(true);
    const response = await apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification/pair`, { method: "POST", headers: authHeaders() });
    if (response.ok) {
      setStatus(await response.json() as NotificationStatus);
      setMessage("Permintaan pairing dikirim. Scan QR WhatsApp di bawah.");
    } else setMessage("Pairing WhatsApp gagal dimulai.");
    setLoading(false);
  };

  const disconnectWhatsApp = async () => {
    if (!ownerId) return;
    setLoading(true);
    const response = await apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification/disconnect`, { method: "POST", headers: authHeaders() });
    if (response.ok) {
      setStatus((current) => current ? { ...current, status: "disconnected" } : { status: "disconnected" });
      setMessage("WhatsApp berhasil diputuskan. Sesi tetap tersimpan.");
    } else setMessage("WhatsApp gagal diputuskan.");
    setLoading(false);
    setShowDisconnectConfirm(false);
  };

  const saveNotificationPhone = async () => {
    if (!ownerId) return;
    const phone = notificationPhone.replace(/\D/g, "").replace(/^0/, "62");
    if (phone.length < 10 || phone.length > 15) {
      setMessage("Pilih nomor WhatsApp owner yang valid.");
      return;
    }
    const response = await apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification/phone`, {
      method: "PUT",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (response.ok) {
      setNotificationPhone(phone);
      setMessage("Nomor WhatsApp owner untuk notifikasi berhasil disimpan.");
    } else {
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(result.message || "Nomor WhatsApp owner gagal disimpan.");
    }
  };

  const sendTestNotification = async (scenario: "cash_request" | "transaction_success") => {
    if (!ownerId) return;
    const phone = (testPhone || notificationPhone).replace(/\D/g, "").replace(/^0/, "62");
    if (phone.length < 10 || phone.length > 15) {
      setMessage("Masukkan nomor WhatsApp yang valid, termasuk kode negara.");
      return;
    }
    setLoading(true);
    const response = await apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification/test`, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ recipient: phone, scenario }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? `Notifikasi tes berhasil dikirim ke ${phone}.` : result.message || "Notifikasi tes gagal dikirim. Pastikan WhatsApp sudah terhubung.");
    setLoading(false);
  };
  const setNotificationsEnabled = async (enabled: boolean) => {
    if (!ownerId) return;
    const response = await apiFetch(`${API_URL}/dashboard/owner/${ownerId}/notification/preferences`, {
      method: "PUT", headers: { ...authHeaders(), "content-type": "application/json" }, body: JSON.stringify({ enabled }),
    });
    if (response.ok) {
      setStatus((current) => current ? { ...current, notificationEnabled: enabled } : current);
      setMessage(enabled ? "Notifikasi owner diaktifkan." : "Notifikasi owner dinonaktifkan.");
    } else setMessage("Pengaturan notifikasi gagal disimpan.");
  };

  return <>
    <div><h2 className="text-2xl font-bold">Pengaturan notifikasi</h2><p className="text-sm text-[#765e52]">Hubungkan WhatsApp untuk menerima pengingat tagihan dan notifikasi pembayaran.</p></div>
    <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Pairing WhatsApp</h3><p className="mt-1 text-sm text-[#765e52]">Mulai pairing dari sini, lalu scan QR menggunakan WhatsApp.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.status === "open" ? "bg-[#d9ead7] text-[#315c32]" : "bg-[#ead0c2] text-[#694536]"}`}>{status?.status === "open" ? "Terhubung" : status?.status || "Memeriksa..."}</span></div>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-[#f8eee7] p-3"><div><p className="text-sm font-semibold">Notifikasi owner</p><p className="text-xs text-[#765e52]">Terima cash request, transaksi berhasil, dan perpanjangan kamar.</p></div><button type="button" onClick={() => void setNotificationsEnabled(status?.notificationEnabled === false)} className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.notificationEnabled === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{status?.notificationEnabled === false ? "Nonaktif" : "Aktif"}</button></div>
        <label className="mt-4 block text-sm font-semibold">Nomor owner untuk notifikasi<select value={notificationPhone} onChange={(event) => setNotificationPhone(event.target.value)} className="mt-2 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2"><option value={status?.ownerPhone || ""}>{status?.ownerPhone || "Nomor owner belum tersedia"}</option><option value="">Pilih nomor lain</option></select><span className="mt-1 block text-xs font-normal text-[#765e52]">Nomor ini menerima pengingat invoice dan notifikasi pembayaran.</span></label>
        <div className="mt-2 flex gap-2"><input type="text" inputMode="tel" value={notificationPhone} onChange={(event) => setNotificationPhone(event.target.value)} placeholder="628123456789" className="min-w-0 flex-1 rounded-lg border border-[#caa897] bg-white px-3 py-2 outline-none focus:border-[#694536]" /><button type="button" onClick={() => void saveNotificationPhone()} className="rounded-lg border border-[#caa897] px-3 py-2 text-sm font-semibold">Simpan nomor</button></div>
        <label className="mt-4 block text-sm font-semibold">Nomor tujuan notifikasi tes<input type="text" inputMode="tel" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="628123456789" className="mt-2 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2 outline-none focus:border-[#694536]" /><span className="mt-1 block text-xs font-normal text-[#765e52]">Gunakan kode negara, contoh: 628123456789.</span></label>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void startPairing()} disabled={loading} className="rounded-lg bg-[#694536] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Menghubungkan..." : "Pairing ulang"}</button><button type="button" onClick={() => setShowDisconnectConfirm(true)} disabled={loading || status?.status !== "open"} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">Disconnect</button><button type="button" onClick={() => void sendTestNotification("cash_request")} disabled={loading || status?.status !== "open" || !(testPhone || notificationPhone).trim()} className="rounded-lg border border-[#caa897] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Tes request cash</button><button type="button" onClick={() => void sendTestNotification("transaction_success")} disabled={loading || status?.status !== "open" || !(testPhone || notificationPhone).trim()} className="rounded-lg border border-[#caa897] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Tes transaksi berhasil</button></div>
        {status?.pairedNumber && <p className="mt-4 text-sm text-[#765e52]">Nomor terhubung: <b>{status.pairedNumber}</b></p>}
      </div>
      <div className="rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 text-center sm:p-6"><h3 className="text-lg font-bold">QR WhatsApp</h3>{status?.qr ? <><div className="mx-auto mt-4 flex min-h-[276px] items-center justify-center rounded-xl bg-white p-2"><canvas ref={qrCanvas} aria-label="QR code WhatsApp pairing" className="max-w-full" /></div><p className="mt-3 text-xs text-[#765e52]">Scan QR ini dengan WhatsApp. QR diperbarui otomatis setiap beberapa detik.</p></> : <div className="mt-4 rounded-xl border border-dashed border-[#caa897] p-10 text-sm text-[#765e52]">{status?.status === "open" ? "WhatsApp sudah terhubung." : "Klik Minta pairing baru untuk menampilkan QR."}</div>}</div>
    </section>
    <section className="mt-5 rounded-2xl border border-[#d7b9a9] bg-[#fffaf5] p-5 sm:p-6"><h3 className="font-bold">Notifikasi yang aktif</h3><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-[#f8eee7] p-4"><b>Pengingat tagihan</b><p className="mt-1 text-xs text-[#765e52]">H-7 dan hari jatuh tempo</p></div><div className="rounded-xl bg-[#f8eee7] p-4"><b>Pembayaran diterima</b><p className="mt-1 text-xs text-[#765e52]">Dikirim kepada pemilik kost</p></div></div></section>
    {showDisconnectConfirm && <ConfirmDialog title="Putuskan WhatsApp?" message="Sesi WhatsApp tetap disimpan dan dapat digunakan kembali." confirmLabel="Putuskan" onClose={() => setShowDisconnectConfirm(false)} onConfirm={() => void disconnectWhatsApp()} />}
  </>;
}
