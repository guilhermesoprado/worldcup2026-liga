import Link from "next/link";

type PhaseHeroProps = {
  title: string;
  completedMatches: number;
  totalMatches: number;
  stateLabel?: string;
  description?: string;
  showEyebrow?: boolean;
  showProgress?: boolean;
  previousPhaseLink?: {
    href: string;
    label: string;
  };
  nextPhaseLink?: {
    href: string;
    label: string;
  };
  nextPhaseDisabled?: boolean;
  phaseLinks?: Array<{
    href: string;
    label: string;
    isActive?: boolean;
  }>;
};

function HeroArrow({
  direction,
  href,
  label,
  disabled = false
}: {
  direction: "left" | "right";
  href?: string;
  label: string;
  disabled?: boolean;
}) {
  const className = [
    "hero__phase-arrow",
    direction === "left" ? "hero__phase-arrow--left" : "hero__phase-arrow--right",
    disabled ? "hero__phase-arrow--disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const iconPath = direction === "left" ? "M11.5 5.5 6.5 10.5l5 5" : "M8.5 5.5l5 5-5 5";

  const icon = (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="hero__phase-arrow-icon">
      <path d={iconPath} />
    </svg>
  );

  if (disabled || !href) {
    return (
      <span className={className} aria-label={label} aria-disabled="true">
        {icon}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label}>
      {icon}
    </Link>
  );
}

export function PhaseHero({
  title,
  completedMatches,
  totalMatches,
  showEyebrow = true,
  showProgress = true,
  previousPhaseLink,
  nextPhaseLink,
  nextPhaseDisabled = false
}: PhaseHeroProps) {
  void completedMatches;
  void totalMatches;
  void showProgress;

  return (
    <section className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__content">
        <div className="hero__headline">
          {showEyebrow ? <span className="hero__eyebrow">Fase atual</span> : null}

          <div className="hero__title-row">
            {previousPhaseLink ? (
              <HeroArrow
                direction="left"
                href={previousPhaseLink.href}
                label={previousPhaseLink.label}
              />
            ) : null}

            <h1>{title}</h1>

            {nextPhaseLink || nextPhaseDisabled ? (
              <HeroArrow
                direction="right"
                href={nextPhaseLink?.href}
                label={nextPhaseLink?.label ?? "Proxima fase indisponivel"}
                disabled={nextPhaseDisabled}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
