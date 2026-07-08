import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const QUARTER_FINALS_EXTERNAL_ROUND_ID = 6;

export default async function QuarterFinalsPage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const quarterFinalsMatches = snapshot.matches.filter((match) => match.phase === "quarter_finals");
  const quarterFinalsMostPicked =
    snapshot.mostPickedByRound[String(QUARTER_FINALS_EXTERNAL_ROUND_ID)] ?? [];
  const shouldShowRound =
    snapshot.availableRounds.includes(QUARTER_FINALS_EXTERNAL_ROUND_ID) &&
    quarterFinalsMatches.length > 0;
  const visibleMatches = shouldShowRound ? quarterFinalsMatches : [];

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Quartas de Final"
        completedMatches={visibleMatches.filter((match) => match.state !== "scheduled").length}
        totalMatches={4}
        previousPhaseLink={{ href: "/oitavas-de-final", label: "Voltar para as oitavas de final" }}
        nextPhaseDisabled
      />

      <section className="card second-phase-page">
        {visibleMatches.length > 0 ? (
          <MatchCards matches={visibleMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Quartas de final ainda indisponiveis"
            description="Os confrontos aparecem aqui quando a rodada das quartas estiver valendo."
          />
        )}
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
        </div>
        {shouldShowRound && quarterFinalsMostPicked.length > 0 ? (
          <MostPickedList players={quarterFinalsMostPicked.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalacoes para as quartas"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
