type StateBadgeProps = {
  label: string;
  tone?: "partial" | "official" | "warning";
};

export function StateBadge({ label, tone = "partial" }: StateBadgeProps) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}

