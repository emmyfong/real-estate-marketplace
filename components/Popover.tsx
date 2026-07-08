"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type PopoverProps = {
  /** Pill label; shows the active value when a filter is set. */
  label: ReactNode;
  /** Highlights the pill when its filter is active. */
  active?: boolean;
  /** Panel body. Receives `close` so an Apply button can dismiss the popover. */
  children: (close: () => void) => ReactNode;
};


export function Popover({ label, active, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
          active
            ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
            : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
        } ${open ? "ring-2 ring-brand-navy/20" : ""}`}
      >
        {label}
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
