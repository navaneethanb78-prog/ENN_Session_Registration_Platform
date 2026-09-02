"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A small modal built on the native <dialog> element, so focus trapping, the
 * Escape key and the top layer are handled by the platform.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      onClick={(e) => {
        // Clicking the backdrop (outside the panel) dismisses the dialog.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-ink-200 bg-white p-0 shadow-[var(--shadow-lift)] backdrop:bg-brand-950/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
      aria-labelledby="enn-dialog-title"
    >
      <div className="p-6">
        <h2 id="enn-dialog-title" className="font-display text-lg font-semibold text-brand-950">
          {title}
        </h2>
        <div className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </div>
    </dialog>
  );
}
