type PhaseHeroProps = {
  title: string;
  completedMatches: number;
  totalMatches: number;
  stateLabel?: string;
};

export function PhaseHero({ title, completedMatches, totalMatches }: PhaseHeroProps) {
  const progress = totalMatches === 0 ? 0 : Math.round((completedMatches / totalMatches) * 100);

  return (
    <section className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__content">
        <div>
          <span className="hero__eyebrow">Fase atual</span>
          <h1>{title}</h1>
        </div>
        <div className="hero__meta">
          <div className="progress">
            <div className="progress__label-row">
              <span>Progresso da fase</span>
              <strong>
                {completedMatches}/{totalMatches} jogos
              </strong>
            </div>
            <div className="progress__track">
              <div className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
