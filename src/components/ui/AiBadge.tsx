import { Sparkles, Database } from "lucide-react";

type AiBadgeProps = {
  variant: "ai" | "factual";
  source?: string;
  className?: string;
};

export default function AiBadge({ variant, source, className = "" }: AiBadgeProps) {
  if (variant === "ai") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-medium ${className}`}
        title="Dette innholdet er generert av kunstig intelligens og bør verifiseres"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {source ? `AI: ${source}` : "AI-forslag"}
      </span>
    );
  }

  // factual variant
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium ${className}`}
      title={`Data hentet direkte fra ${source || "faktiske kilder"}`}
    >
      <Database className="w-3.5 h-3.5" />
      {source || "Faktisk data"}
    </span>
  );
}
