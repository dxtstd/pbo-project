import { useState } from "react";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationWord?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  confirmationWord,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");
  const canConfirm = !confirmationWord || value === confirmationWord;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#3e2f28]/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-[#fffaf5] p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-[#3e2f28]">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#765e52]">{message}</p>
      {confirmationWord && <label className="mt-4 block text-sm font-semibold text-[#3e2f28]">Ketik <code className="rounded bg-[#ead0c2] px-1.5 py-0.5">{confirmationWord}</code> untuk melanjutkan<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-lg border border-[#caa897] bg-white px-3 py-2" /></label>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-[#caa897] px-4 py-2 text-sm font-semibold">{cancelLabel}</button>
        <button type="button" disabled={!canConfirm} onClick={onConfirm} className="rounded-lg bg-[#694536] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{confirmLabel}</button>
      </div>
    </div>
  </div>;
}
