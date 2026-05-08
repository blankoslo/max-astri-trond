"use client";

import { useState, useEffect, useCallback } from "react";
import type { Expense } from "@/types";
import type { Participant } from "@/lib/participants";
import {
  getExpenses,
  addExpense,
  removeExpense,
  calculateBalances,
  minimizeSettlements,
} from "@/lib/expenses";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tripId: string;
  participants: Participant[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNok(amount: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Empty-state form defaults ────────────────────────────────────────────────

function emptyForm(participants: Participant[]) {
  return {
    description: "",
    amount: "",
    payer_id: participants[0]?.id ?? "",
    date: todayIso(),
    split_among: participants.map((p) => p.id), // everyone by default
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpensePanel({ tripId, participants }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(() => emptyForm(participants));

  // ── Load from localStorage on mount / tripId change ─────────────────────
  useEffect(() => {
    const loadData = () => {
      setExpenses(getExpenses(tripId));
      setForm(emptyForm(participants));
    };
    loadData();
  }, [tripId, participants]);

  // ── Participant name lookup ──────────────────────────────────────────────
  const nameOf = useCallback(
    (id: string) => participants.find((p) => p.id === id)?.name ?? id,
    [participants],
  );

  // ── Toggle participant in split_among ────────────────────────────────────
  function toggleSplit(pid: string) {
    setForm((f) => {
      const already = f.split_among.includes(pid);
      return {
        ...f,
        split_among: already
          ? f.split_among.filter((id) => id !== pid)
          : [...f.split_among, pid],
      };
    });
  }

  // ── Add expense ──────────────────────────────────────────────────────────
  function handleAdd() {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.description.trim()) {
      setFormError("Skriv inn en beskrivelse");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError("Skriv inn et gyldig beløp");
      return;
    }
    if (!form.payer_id) {
      setFormError("Velg hvem som betalte");
      return;
    }
    if (form.split_among.length === 0) {
      setFormError("Velg minst én person å dele med");
      return;
    }

    const newExpense = addExpense(tripId, {
      payer_id: form.payer_id,
      description: form.description.trim(),
      amount,
      date: form.date,
      split_among: form.split_among,
    });

    setExpenses((prev) => [...prev, newExpense]);
    setForm(emptyForm(participants));
    setShowForm(false);
    setFormError("");
    setShowSettlement(false); // recalculate when they click again
  }

  // ── Remove expense ───────────────────────────────────────────────────────
  function handleRemove(expenseId: string) {
    removeExpense(tripId, expenseId);
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    setShowSettlement(false);
  }

  // ── Settlement calculation ───────────────────────────────────────────────
  const balances = calculateBalances(expenses);
  const settlements = minimizeSettlements(balances);

  // ── Render ───────────────────────────────────────────────────────────────

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  if (participants.length < 2) {
    return (
      <p className="text-xs py-2" style={{ color: "var(--color-neutral-300)" }}>
        Minst 2 deltakere trengs for å registrere utgifter.
      </p>
    );
  }

  return (
    <div>
      {/* ── Summary pill row ───────────────────────────────────────────── */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: "var(--color-brand-100)",
              color: "var(--color-brand-500)",
            }}
          >
            {expenses.length} {expenses.length === 1 ? "utgift" : "utgifter"}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: "var(--color-neutral-100)",
              color: "var(--color-neutral-500)",
            }}
          >
            Totalt {fmtNok(totalSpent)}
          </span>
        </div>
      )}

      {/* ── Expense list ───────────────────────────────────────────────── */}
      {expenses.length === 0 && !showForm && (
        <p className="text-xs py-1 mb-3" style={{ color: "var(--color-neutral-300)" }}>
          Ingen utgifter registrert ennå. Legg til den første!
        </p>
      )}

      {expenses.length > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {expenses.map((exp) => {
            const splitCount = exp.split_among.length;
            const perPerson = Math.round((exp.amount / splitCount) * 10) / 10;
            return (
              <li
                key={exp.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: "#f8f9fb",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                {/* Icon */}
                <span className="text-base mt-0.5 shrink-0">🧾</span>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-neutral-600)" }}
                  >
                    {exp.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-400)" }}>
                    <span className="font-medium" style={{ color: "var(--color-neutral-500)" }}>
                      {nameOf(exp.payer_id)}
                    </span>{" "}
                    betalte · delt på {splitCount} ({fmtNok(perPerson)}/pers)
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-300)" }}>
                    {new Date(exp.date).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "short",
                    })}
                    {exp.split_among.length < participants.length && (
                      <span
                        className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: "var(--color-warning-light)",
                          color: "var(--color-warning)",
                        }}
                      >
                        deltvis deltakelse
                      </span>
                    )}
                  </p>
                </div>

                {/* Amount + delete */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--color-neutral-600)" }}
                  >
                    {fmtNok(exp.amount)}
                  </span>
                  <button
                    onClick={() => handleRemove(exp.id)}
                    className="text-xs hover:underline"
                    style={{ color: "var(--color-error)" }}
                    aria-label="Slett utgift"
                  >
                    Slett
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Add expense form ───────────────────────────────────────────── */}
      {showForm && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "white",
            border: "1.5px solid var(--color-brand-300)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--color-brand-500)" }}
          >
            Ny utgift
          </p>

          {/* Description */}
          <div className="mb-3">
            <label className="text-xs font-semibold mb-1 block"
              style={{ color: "var(--color-neutral-400)" }}>
              Beskrivelse
            </label>
            <input
              type="text"
              placeholder="f.eks. Dagligvarer, Hytteleie, Buss…"
              value={form.description}
              onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setFormError(""); }}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-neutral-600)",
                // @ts-expect-error css var ring
                "--tw-ring-color": "var(--color-brand-400)",
              }}
            />
          </div>

          {/* Amount + Date in a row */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs font-semibold mb-1 block"
                style={{ color: "var(--color-neutral-400)" }}>
                Beløp (kr)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.amount}
                onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setFormError(""); }}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-neutral-600)",
                  // @ts-expect-error css var ring
                  "--tw-ring-color": "var(--color-brand-400)",
                }}
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold mb-1 block"
                style={{ color: "var(--color-neutral-400)" }}>
                Dato
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-neutral-600)",
                  // @ts-expect-error css var ring
                  "--tw-ring-color": "var(--color-brand-400)",
                }}
              />
            </div>
          </div>

          {/* Payer */}
          <div className="mb-3">
            <label className="text-xs font-semibold mb-1 block"
              style={{ color: "var(--color-neutral-400)" }}>
              Hvem betalte?
            </label>
            <select
              value={form.payer_id}
              onChange={(e) => setForm((f) => ({ ...f, payer_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-neutral-600)",
                background: "white",
                // @ts-expect-error css var ring
                "--tw-ring-color": "var(--color-brand-400)",
              }}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Split among */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-1.5 block"
              style={{ color: "var(--color-neutral-400)" }}>
              Dele med (velg hvem som var med)
            </label>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const checked = form.split_among.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSplit(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                    style={{
                      background: checked ? "var(--color-brand-100)" : "white",
                      borderColor: checked ? "var(--color-brand-400)" : "var(--color-border-default)",
                      color: checked ? "var(--color-brand-500)" : "var(--color-neutral-400)",
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0"
                      style={{
                        background: checked ? "var(--color-brand-500)" : "transparent",
                        borderColor: checked ? "var(--color-brand-500)" : "var(--color-neutral-300)",
                      }}
                    >
                      {checked && (
                        <svg className="w-2 h-2" viewBox="0 0 10 10" fill="white">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.5}
                            strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
            {form.split_among.length < participants.length && form.split_among.length > 0 && (
              <p className="text-xs mt-1.5" style={{ color: "var(--color-warning)" }}>
                ⚠️ Deltvis deltakelse — kun valgte personer betaler denne utgiften
              </p>
            )}
          </div>

          {formError && (
            <p className="text-xs mb-2" style={{ color: "var(--color-error)" }}>{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: "var(--color-brand-500)", color: "white" }}
            >
              Legg til utgift
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); setForm(emptyForm(participants)); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-100"
              style={{ color: "var(--color-neutral-400)" }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setShowSettlement(false); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: "var(--color-brand-500)", color: "white" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Legg til utgift
          </button>
        )}

        {expenses.length >= 2 && !showForm && (
          <button
            onClick={() => setShowSettlement((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border hover:bg-slate-50 transition-all"
            style={{
              borderColor: "var(--color-brand-400)",
              color: "var(--color-brand-500)",
              background: "white",
            }}
          >
            {showSettlement ? "Skjul oppgjør" : "Beregn oppgjør →"}
          </button>
        )}
      </div>

      {/* ── Settlement results ─────────────────────────────────────────── */}
      {showSettlement && expenses.length > 0 && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{
            background: "#f0f4ff",
            border: "1px solid var(--color-brand-200)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--color-brand-500)" }}
          >
            Oppgjørsoversikt
          </p>

          {/* Individual balances */}
          <div className="mb-3">
            <p className="text-xs font-semibold mb-2"
              style={{ color: "var(--color-neutral-400)" }}>
              Saldo per person
            </p>
            <ul className="flex flex-col gap-1.5">
              {participants.map((p) => {
                const bal = Math.round((balances.get(p.id) ?? 0) * 100) / 100;
                const isCreditor = bal > 0.01;
                const isDebtor   = bal < -0.01;
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    {/* Avatar */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "var(--color-brand-100)",
                        color: "var(--color-brand-500)",
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm" style={{ color: "var(--color-neutral-600)" }}>
                      {p.name}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: isCreditor
                          ? "var(--color-success)"
                          : isDebtor
                          ? "var(--color-error)"
                          : "var(--color-neutral-300)",
                      }}
                    >
                      {isCreditor && "+"}
                      {fmtNok(bal)}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                      {isCreditor ? "til gode" : isDebtor ? "skylder" : "i balanse"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Minimal transactions */}
          <div
            className="pt-3"
            style={{ borderTop: "1px solid var(--color-brand-200)" }}
          >
            <p className="text-xs font-semibold mb-2"
              style={{ color: "var(--color-neutral-400)" }}>
              {settlements.length === 0
                ? "Ingen overføringer nødvendig"
                : `${settlements.length} overføring${settlements.length !== 1 ? "er" : ""} for å gjøre opp`}
            </p>

            {settlements.length === 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--color-success-light)" }}
              >
                <span>✅</span>
                <span className="text-xs" style={{ color: "var(--color-success)" }}>
                  Alle er i balanse — ingenting å betale!
                </span>
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {settlements.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: "white",
                    border: "1px solid var(--color-border-default)",
                  }}
                >
                  {/* From avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "var(--color-error-light)",
                      color: "var(--color-error)",
                    }}
                  >
                    {nameOf(s.from).charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
                      <span className="font-semibold">{nameOf(s.from)}</span>
                      {" betaler "}
                      <span className="font-semibold">{nameOf(s.to)}</span>
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 shrink-0" style={{ color: "var(--color-neutral-300)" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>

                  {/* To avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "var(--color-success-light)",
                      color: "var(--color-success)",
                    }}
                  >
                    {nameOf(s.to).charAt(0).toUpperCase()}
                  </div>

                  {/* Amount chip */}
                  <span
                    className="ml-1 px-2.5 py-1 rounded-full text-sm font-bold shrink-0"
                    style={{
                      background: "var(--color-brand-100)",
                      color: "var(--color-brand-500)",
                    }}
                  >
                    {fmtNok(s.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
