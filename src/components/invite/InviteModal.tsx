"use client";

import { useState, useEffect } from "react";

interface Props {
  tripId: string | number;
  tripName: string;
  onClose: () => void;
}

export default function InviteModal({ tripId, tripName, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/trips/${tripId}`);
  }, [tripId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const el = document.getElementById("invite-url-input") as HTMLInputElement;
      el?.select();
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "white" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-neutral-600)" }}>
              Inviter deltakere
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-300)" }}>
              Del lenken slik at folk kan se og bli med på turen
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Lukk"
          >
            <svg className="w-4 h-4" style={{ color: "var(--color-neutral-400)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Trip name badge */}
        <div
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
          style={{ background: "var(--color-brand-100)" }}
        >
          <span>🏔️</span>
          <span className="text-sm font-medium truncate" style={{ color: "var(--color-brand-500)" }}>
            {tripName}
          </span>
        </div>

        {/* URL row */}
        <div className="flex gap-2 mb-4">
          <input
            id="invite-url-input"
            readOnly
            value={url}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs border"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-neutral-500)",
              background: "#f8f9fb",
            }}
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: copied ? "var(--color-success)" : "var(--color-brand-500)",
              color: "white",
            }}
          >
            {copied ? "✓ Kopiert!" : "Kopier"}
          </button>
        </div>

        {/* Info note */}
        <p className="text-xs text-center" style={{ color: "var(--color-neutral-300)" }}>
          Alle med lenken kan se turdetaljer og melde seg på uten å logge inn.
        </p>
      </div>
    </div>
  );
}
