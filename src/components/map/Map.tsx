"use client";

import dynamic from "next/dynamic";

// MapLibre uses browser APIs — must not run on the server
const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Laster kart…</span>
      </div>
    </div>
  ),
});

export default function Map() {
  return <MapInner />;
}
