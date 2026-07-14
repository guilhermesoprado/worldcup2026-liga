import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const SEMI_FINALS_EXTERNAL_ROUND_ID = 7;
const FINAL_EXTERNAL_ROUND_ID = 8;

export default async function SemiFinalPage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const semiFinalsMatches = snapshot.matches.filter(
    (match) => match.phase === "semi_finals"
  );
  const finalRoundMatches = snapshot.matches.filter(
    (match) => match.phase === "final" || match.phase === "third_place"
  );
  const semiFinalsMostPicked =
    snapshot.mostPickedByRound[String(SEMI_FINALS_EXTERNAL_ROUND_ID)] ?? [];
  const shouldShowRound =
    snapshot.availableRounds.includes(SEMI_FINALS_EXTERNAL_ROUND_ID) &&
    semiFinalsMatches.length > 0;
  const finalAvailable =
    snapshot.availableRounds.includes(FINAL_EXTERNAL_ROUND_ID) &&
    finalRoundMatches.some((match) => match.state !== "scheduled");
  const visibleMatches = shouldShowRound ? semiFinalsMatches : [];

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Semi-final"
        completedMatches={
          visibleMatches.filter((match) => match.state !== "scheduled").length
        }
        totalMatches={2}
        previousPhaseLink={{
          href: "/quartas-de-final",
          label: "Voltar para as quartas de final"
        }}
        nextPhaseLink={
          finalAvailable
            ? { href: "/final", label: "Ir para a final" }
            : undefined
        }
        nextPhaseDisabled={!finalAvailable}
      />

      <section className="card second-phase-page">
        {visibleMatches.length > 0 ? (
          <MatchCards matches={visibleMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Semi-final ainda indisponivel"
            description="Os confrontos aparecem aqui quando a rodada da semi-final estiver valendo."
          />
        )}
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
        </div>
        {shouldShowRound && semiFinalsMostPicked.length > 0 ? (
          <MostPickedList players={semiFinalsMostPicked.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalacoes para a semi-final"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
