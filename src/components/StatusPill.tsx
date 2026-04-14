import React from "react";

interface StatusPillProps {
  label: string;
  tone?: "neutral" | "success" | "warning";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={`rf-pill rf-pill--${tone}`}>{label}</span>;
}
