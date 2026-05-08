"use client";

/**
 * OfflineDownloadButton (F8 — T1)
 *
 * Generates a static PDF turguide and auto-downloads it.
 * Includes: route map (canvas), participants, stages, cabins, emergency numbers.
 */

import { useState, useCallback } from "react";
import type { UtnoTrip, UtnoCabin } from "@/types";
import type { OfflineStage } from "@/lib/offlineTypes";

interface Participant { name: string }

interface Props {
  trip: UtnoTrip;
  cabins: UtnoCabin[];
  stages: OfflineStage[];
  participants: Participant[];
}

// ── Route map canvas ──────────────────────────────────────────────────────────

function buildRouteCanvas(trip: UtnoTrip, cabins: UtnoCabin[]): string | null {
  const coords = trip.geojson?.coordinates;
  if (!coords || coords.length < 2) return null;

  const W = 700, H = 300;
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Bounding box + padding
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const pad      = 0.15;
  const lonRange = (Math.max(...lons) - Math.min(...lons)) || 0.005;
  const latRange = (Math.max(...lats) - Math.min(...lats)) || 0.005;
  const minLon = Math.min(...lons) - lonRange * pad;
  const maxLon = Math.max(...lons) + lonRange * pad;
  const minLat = Math.min(...lats) - latRange * pad;
  const maxLat = Math.max(...lats) + latRange * pad;

  const proj = (lon: number, lat: number): [number, number] => [
    ((lon - minLon) / (maxLon - minLon)) * W,
    (1 - (lat - minLat) / (maxLat - minLat)) * H,
  ];

  // Background
  ctx.fillStyle = "#eef3ee";
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = "#dde9dd";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo((W / 4) * i, 0); ctx.lineTo((W / 4) * i, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (H / 4) * i); ctx.lineTo(W, (H / 4) * i); ctx.stroke();
  }

  // Route shadow
  ctx.beginPath();
  const [sx0, sy0] = proj(coords[0][0], coords[0][1]);
  ctx.moveTo(sx0, sy0 + 3);
  for (let i = 1; i < coords.length; i++) {
    const [x, y] = proj(coords[i][0], coords[i][1]);
    ctx.lineTo(x, y + 3);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 8; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.stroke();

  // Route line
  ctx.beginPath();
  const [sx, sy] = proj(coords[0][0], coords[0][1]);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < coords.length; i++) {
    const [x, y] = proj(coords[i][0], coords[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#4f59fb";
  ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.stroke();

  // Cabin dots
  for (const cabin of cabins) {
    if (!cabin.geojson?.coordinates) continue;
    const [clon, clat] = cabin.geojson.coordinates;
    const [cx, cy] = proj(clon, clat);
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.stroke();
  }

  // Start (green)
  const [ex, ey] = proj(coords[0][0], coords[0][1]);
  ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#0f8402"; ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke();

  // End (red)
  const last = coords[coords.length - 1];
  const [lx, ly] = proj(last[0], last[1]);
  ctx.beginPath(); ctx.arc(lx, ly, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#bf0000"; ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke();

  // Border
  ctx.strokeStyle = "#c5d5c5"; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  return canvas.toDataURL("image/png");
}

// ── PDF builder ───────────────────────────────────────────────────────────────

export default function OfflineDownloadButton({ trip, cabins, stages, participants }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageW  = doc.internal.pageSize.getWidth();
      const pageH  = doc.internal.pageSize.getHeight();
      const margin = 18;
      const colW   = pageW - margin * 2;
      let   y      = margin;

      const LINE_H = 6.5;
      const GAP_S  = 3;
      const GAP_M  = 8;

      // ── Header stripe ────────────────────────────────────────────────────
      doc.setFillColor(79, 89, 251);
      doc.rect(0, 0, pageW, 13, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Friluftskompis - Turguide", margin, 9);
      y = 21;

      // ── Trip title ───────────────────────────────────────────────────────
      doc.setTextColor(25, 25, 35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      const titleLines = doc.splitTextToSize(trip.name, colW) as string[];
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + GAP_S;

      // ── Meta row ─────────────────────────────────────────────────────────
      const meta: string[] = [];
      if (trip.distance)      meta.push(`${(trip.distance / 1000).toFixed(1)} km`);
      if (trip.durationDays)  meta.push(`${trip.durationDays} ${trip.durationDays === 1 ? "dag" : "dager"}`);
      if (trip.elevationGain) meta.push(`+${Math.round(trip.elevationGain / 10) * 10} hm`);
      if (trip.grading)       meta.push(gradingLabel(trip.grading));
      const area = trip.areas[0]?.name ?? trip.counties[0]?.name;
      if (area) meta.push(area);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 120);
      if (meta.length) { doc.text(meta.join("  -  "), margin, y); y += LINE_H; }
      y += GAP_S;

      // ── Route map ─────────────────────────────────────────────────────────
      const mapImg = buildRouteCanvas(trip, cabins);
      if (mapImg) {
        const mapH = Math.round(colW * (300 / 700)); // keep 700:300 aspect
        doc.addImage(mapImg, "PNG", margin, y, colW, mapH);
        y += mapH + GAP_M;
      }

      // ── Divider ───────────────────────────────────────────────────────────
      doc.setDrawColor(220, 220, 232);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += GAP_M;

      // ── Deltakere ─────────────────────────────────────────────────────────
      if (participants.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(45, 45, 58);
        doc.text("Deltakere", margin, y);
        y += LINE_H + GAP_S;

        // Names in 2-column grid
        const half = Math.ceil(participants.length / 2);
        const col2X = margin + colW / 2;

        for (let i = 0; i < half; i++) {
          if (y > 270) { doc.addPage(); y = margin; }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 65);

          doc.text(`- ${participants[i].name}`, margin, y);
          if (participants[i + half]) {
            doc.text(`- ${participants[i + half].name}`, col2X, y);
          }
          y += LINE_H;
        }
        y += GAP_M;

        doc.setDrawColor(220, 220, 232);
        doc.line(margin, y, pageW - margin, y);
        y += GAP_M;
      }

      // ── Dagsetapper ───────────────────────────────────────────────────────
      if (stages.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(45, 45, 58);
        doc.text("Dagsetapper", margin, y);
        y += LINE_H + GAP_S;

        for (const stage of stages) {
          if (y > 268) { doc.addPage(); y = margin; }

          // Day badge
          doc.setFillColor(79, 89, 251);
          doc.roundedRect(margin, y - 4.2, 7.5, 5.5, 1.5, 1.5, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(String(stage.day), margin + 3.75, y - 0.3, { align: "center" });

          // Stage route
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(35, 35, 48);
          doc.text(`${stage.startName}  >  ${stage.endName}`, margin + 10, y);
          y += 5;

          // Stage stats
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(105, 105, 125);
          const info = [
            `${stage.distanceKm} km`,
            `ca. ${stage.estimatedHours} t`,
            stage.isOvernight ? "overnatting" : "dagstur",
          ].join("  -  ");
          doc.text(info, margin + 10, y);
          y += LINE_H + GAP_S;
        }
        y += GAP_S;
      }

      // ── Hytter langs ruten ────────────────────────────────────────────────
      const validCabins = cabins.filter((c) => c.name);
      if (validCabins.length > 0) {
        if (y > 248) { doc.addPage(); y = margin; }

        doc.setDrawColor(220, 220, 232);
        doc.line(margin, y, pageW - margin, y);
        y += GAP_M;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(45, 45, 58);
        doc.text("Hytter langs ruten", margin, y);
        y += LINE_H + GAP_S;

        for (const cabin of validCabins.slice(0, 14)) {
          if (y > 268) { doc.addPage(); y = margin; }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(35, 35, 48);
          doc.text(`- ${cabin.name}`, margin, y);

          const beds = (cabin.bedsStaffed ?? 0) + (cabin.bedsSelfService ?? 0) + (cabin.bedsNoService ?? 0);
          const details: string[] = [serviceLevelLabel(cabin.serviceLevel)];
          if (beds > 0) details.push(`${beds} senger`);
          if (cabin.phone) details.push(`Tlf: ${cabin.phone}`);

          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(105, 105, 125);
          doc.text(details.join("  -  "), margin + 3, y);
          y += LINE_H;
        }
        if (validCabins.length > 14) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 165);
          doc.text(`... og ${validCabins.length - 14} hytter til`, margin, y);
          y += LINE_H;
        }
      }

      // ── Emergency footer (pinned to bottom of last page) ──────────────────
      const totalPages = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1;
      doc.setPage(totalPages);
      const footerY = pageH - 15;

      doc.setFillColor(243, 244, 252);
      doc.rect(margin, footerY - 5, colW, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(79, 89, 251);
      doc.text("Nodummer i Norge:", margin + 3, footerY + 0.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 55, 68);
      doc.text(
        "Redning 110 / Politi 112 / Medisinsk 113 / Rode Kors: 800 30 570",
        margin + 3, footerY + 5.5
      );

      // ── Save ──────────────────────────────────────────────────────────────
      const safeName = trip.name.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      doc.save(`${safeName || "tur"}-turguide.pdf`);

    } catch (err) {
      console.error("[TripPDF]", err);
      alert("Kunne ikke generere PDF. Provigjen.");
    } finally {
      setLoading(false);
    }
  }, [trip, cabins, stages, participants]);

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
      style={{
        background: "white",
        color: "var(--color-neutral-600)",
        border: "1.5px solid var(--color-border-default, #e2e8f0)",
      }}
    >
      {loading ? (
        <>
          <span
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
            style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent",
              display: "inline-block" }}
          />
          Genererer PDF...
        </>
      ) : (
        <>
          <DownloadIcon />
          Last ned turguide (PDF)
        </>
      )}
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gradingLabel(g: string | null): string {
  switch (g) {
    case "EASY":       return "Enkel";
    case "MODERATE":   return "Moderat";
    case "TOUGH":      return "Krevende";
    case "VERY_TOUGH": return "Meget krevende";
    default:           return "";
  }
}

function serviceLevelLabel(level: string | null): string {
  switch (level) {
    case "STAFFED":           return "Betjent";
    case "SELF_SERVICE":      return "Selvbetjent";
    case "NO_SERVICE":        return "Uten betjening";
    case "EMERGENCY_SHELTER": return "Nodhytte";
    case "RENTAL":            return "Utleie";
    default:                  return "Hytte";
  }
}
