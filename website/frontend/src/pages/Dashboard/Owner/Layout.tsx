import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { loadOwnerDashboard } from "./api";
import type { OwnerData } from "./types";
import { Toast } from "../../../components/Toast";
import { useAuthStore } from "../../../stores/auth";
import { ApiLoading } from "../../../components/ApiLoading";

export function OwnerLayout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.logout);
  const [data, setData] = useState<OwnerData>();
  const [message, setMessage] = useState("");
  const ownerId = localStorage.getItem("userId");

  const refresh = async () => {
    if (!ownerId) return navigate("/login");
    try {
      setData(await loadOwnerDashboard(ownerId));
    } catch {
      setMessage("Server belum siap. Mohon menunggu lalu coba lagi.");
    }
  };

  useEffect(() => {
    if (!ownerId) {
      navigate("/login");
      return;
    }
    void loadOwnerDashboard(ownerId)
      .then(setData)
      .catch(() => setMessage("Server belum siap. Mohon menunggu lalu coba lagi."));
  }, [ownerId, navigate]);

  const logout = () => {
    clearAuth();
    setData(undefined);
    navigate("/login", { replace: true });
  };
  if (!data) return <ApiLoading />;

  const ownerName = data.owner?.firstname || "Pemilik";
  const navigation = [
    { to: "/dashboard/owner", label: "Ringkasan", end: true },
    { to: "/dashboard/owner/kamar", label: "Daftar kamar" },
    { to: "/dashboard/owner/customer", label: "Daftar customer" },
    { to: "/dashboard/owner/pembayaran", label: "Pembayaran" },
    { to: "/dashboard/owner/rekap", label: "Rekap bulanan" },
    { to: "/dashboard/owner/pengaturan", label: "Pengaturan" },
  ];

  return (
    <main className="min-h-screen bg-[#efe2d6] text-[#3e2f28]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#dcc2b3] bg-[#f8eee7] px-6 py-8 lg:flex">
          <div className="font-serif text-xl font-bold">Kost Camp M2</div>
          <p className="mt-1 text-xs text-[#765e52]">Panel pengelolaan</p>
          <nav className="mt-12 space-y-2 text-sm">
            {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `block rounded-xl px-4 py-3 ${isActive ? "bg-[#694536] font-semibold text-white" : "text-[#765e52] hover:bg-[#ead0c2]"}`}>{item.label}</NavLink>)}
          </nav>
          <button type="button" onClick={logout} className="mt-auto rounded-lg border border-[#caa897] px-4 py-2 text-sm font-medium text-[#3e2f28] transition hover:bg-[#ead0c2]">Keluar</button>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:items-center">
            <div className="min-w-0"><p className="text-xs text-[#765e52] sm:text-sm">Dashboard Pemilik</p><h1 className="truncate font-serif text-2xl font-bold sm:text-4xl">Kost Camp M2</h1></div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{ownerName}</p><p className="text-xs text-[#765e52]">{data.owner?.email || "Akun pemilik"}</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-[#694536] text-sm font-semibold text-white sm:h-11 sm:w-11">{ownerName.slice(0, 1).toUpperCase()}</div><button type="button" onClick={logout} className="rounded-lg border border-[#caa897] px-2.5 py-2 text-xs sm:px-3 sm:text-sm lg:hidden">Keluar</button></div>
          </header>
          <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2 text-sm ${isActive ? "bg-[#694536] text-white" : "bg-[#f8eee7] text-[#765e52]"}`}>{item.label}</NavLink>)}</div>
          <Outlet context={{ data, refresh, setMessage }} />
          {message && <Toast message={message} onClose={() => setMessage("")} />}
        </div>
      </div>
    </main>
  );
}
