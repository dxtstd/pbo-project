import { useCallback, useEffect, useState } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  const closeToast = useCallback(() => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(onClose, 240);
  }, [isClosing, onClose]);

  useEffect(() => {
    const timer = window.setTimeout(closeToast, 4500);
    return () => window.clearTimeout(timer);
  }, [closeToast, message]);

  return (
    <div
      className={`fixed inset-x-3 top-3 z-[100] sm:left-auto sm:right-5 sm:top-5 sm:w-[min(420px,calc(100vw-2rem))] ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      }`}
      role="alert"
    >
      <div className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-[#caa897] bg-[#fffaf5] px-4 py-3 text-sm text-[#3e2f28] shadow-xl shadow-[#694536]/15">
        <div className="absolute inset-x-0 top-0 h-0.5 origin-left animate-toast-progress bg-[#694536]" />
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#694536] text-xs font-bold text-white shadow-[0_0_0_5px_rgba(105,69,54,0.08)]">!</span>
        <p className="min-w-0 flex-1 break-words">{message}</p>
        <button type="button" onClick={closeToast} aria-label="Tutup notifikasi" className="text-lg leading-none text-[#765e52] transition-transform duration-200 hover:scale-125 hover:text-[#3e2f28]">×</button>
      </div>
    </div>
  );
}
