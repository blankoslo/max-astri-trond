import Link from "next/link";
import {
  CheckCircle,
  AlertCircle,
  Key,
  Globe,
  ExternalLink,
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  requiresKey: boolean;
  keyName?: string;
  status: "configured" | "missing";
  isPublic: boolean;
}

export default function AdminPage() {
  // Check environment variables at build time (server-side)
  const anthropicKeySet = !!process.env.ANTHROPIC_API_KEY;
  const supabaseUrlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKeySet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const dataSources: DataSource[] = [
    {
      id: "yr",
      name: "Yr / MET Norway",
      description: "Værdata for turstier og planlegging",
      endpoint: "https://api.met.no/weatherapi/locationforecast/2.0/compact",
      requiresKey: false,
      isPublic: true,
      status: "configured",
    },
    {
      id: "utno",
      name: "UT.no GraphQL",
      description: "Turforslag fra Den Norske Turistforeningen",
      endpoint: "https://ut-backend-api-2-41145913385.europe-north1.run.app",
      requiresKey: false,
      isPublic: true,
      status: "configured",
    },
    {
      id: "kartverket",
      name: "Kartverket",
      description: "Kartfliser for kartvisualisering",
      endpoint: "https://services.kartverket.no",
      requiresKey: false,
      isPublic: true,
      status: "configured",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      description: "AI-assistanse for pakkelister og tursammendrag",
      endpoint: "https://api.anthropic.com",
      requiresKey: true,
      keyName: "ANTHROPIC_API_KEY",
      isPublic: false,
      status: anthropicKeySet ? "configured" : "missing",
    },
    {
      id: "supabase",
      name: "Supabase",
      description: "Database og autentisering",
      endpoint: "https://supabase.co",
      requiresKey: true,
      keyName: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY",
      isPublic: false,
      status:
        supabaseUrlSet && supabaseAnonKeySet ? "configured" : "missing",
    },
  ];

  const configuredCount = dataSources.filter(
    (ds) => ds.status === "configured"
  ).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8f9fb" }}>
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center gap-3 px-6 py-3"
        style={{
          background: "white",
          borderBottom: "1px solid var(--color-border-default)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        }}
      >
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <span className="text-2xl">⛰️</span>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--color-brand-500)" }}
          >
            friluftskompis
          </span>
        </Link>
        <span
          className="text-sm ml-1 hidden sm:block"
          style={{ color: "var(--color-neutral-300)" }}
        >
          — admin
        </span>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Page title */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ background: "var(--color-brand-100)" }}
            >
              <Key
                size={20}
                style={{ color: "var(--color-brand-500)" }}
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: "var(--color-neutral-600)" }}
              >
                Systemkonfigurasjon
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-neutral-400)" }}
              >
                API-nøkler og datakilde-tilganger
              </p>
            </div>
          </div>

          {/* Status summary */}
          <div
            className="mb-8 p-4 rounded-lg border"
            style={{
              background: "white",
              borderColor: "var(--color-border-default)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-neutral-600)" }}
            >
              Status: {configuredCount} av {dataSources.length} kilder er
              konfigurert
            </p>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${(configuredCount / dataSources.length) * 100}%`,
                  background: "var(--color-success)",
                }}
              />
            </div>
          </div>

          {/* Data sources grid */}
          <div className="grid gap-4 mb-8">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="border rounded-lg p-5 transition-shadow hover:shadow-md"
                style={{
                  background: "white",
                  borderColor: "var(--color-border-default)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Name and status badge */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: "var(--color-neutral-600)" }}
                      >
                        {source.name}
                      </h3>
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background:
                            source.status === "configured"
                              ? "var(--color-success-light)"
                              : "var(--color-warning-light)",
                          color:
                            source.status === "configured"
                              ? "var(--color-success)"
                              : "var(--color-warning)",
                        }}
                      >
                        {source.status === "configured" ? (
                          <CheckCircle size={14} />
                        ) : (
                          <AlertCircle size={14} />
                        )}
                        {source.status === "configured"
                          ? "Konfigurert"
                          : "Mangler"}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="text-sm mb-3"
                      style={{ color: "var(--color-neutral-400)" }}
                    >
                      {source.description}
                    </p>

                    {/* Details grid */}
                    <div className="grid gap-3 text-sm">
                      {/* Endpoint */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Globe
                            size={16}
                            style={{ color: "var(--color-neutral-300)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            style={{ color: "var(--color-neutral-400)" }}
                            className="text-xs font-medium"
                          >
                            Endepunkt
                          </p>
                          <a
                            href={source.endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 break-all flex items-center gap-1 mt-1"
                            style={{ color: "var(--color-info)" }}
                          >
                            <span className="break-all">{source.endpoint}</span>
                            <ExternalLink size={12} className="flex-shrink-0" />
                          </a>
                        </div>
                      </div>

                      {/* Authentication requirement */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Key
                            size={16}
                            style={{ color: "var(--color-neutral-300)" }}
                          />
                        </div>
                        <div>
                          <p
                            style={{ color: "var(--color-neutral-400)" }}
                            className="text-xs font-medium"
                          >
                            Autentisering
                          </p>
                          {source.requiresKey ? (
                            <p
                              className="mt-1 font-mono text-xs"
                              style={{ color: "var(--color-neutral-500)" }}
                            >
                              {source.keyName}
                            </p>
                          ) : (
                            <p
                              className="mt-1 text-xs"
                              style={{ color: "var(--color-success)" }}
                            >
                              Offentlig API (ingen nøkkel kreves)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Configuration note */}
          <div
            className="border rounded-lg p-5"
            style={{
              background: "var(--color-info-light)",
              borderColor: "var(--color-info)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-info)" }}
            >
              ℹ️ Konfigurering av API-nøkler
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: "var(--color-info)" }}
            >
              API-nøkler konfigureres i filen{" "}
              <code
                className="font-mono bg-white bg-opacity-50 px-2 py-1 rounded"
              >
                .env.local
              </code>
              . Denne filen sjekkes ikke inn i versionskontroll og må opprettholdes
              lokalt på hver maskin og distribueres sikkert til produksjonsmiljøer.
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: "var(--color-info)" }}
            >
              Offentlige API-er (Yr, UT.no, Kartverket) krever ingen
              autentisering.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
