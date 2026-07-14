import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const FINAL_EXTERNAL_ROUND_ID = 8;

export default async function FinalPage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const finalMatches = snapshot.matches.filter(
    (match) => match.phase === "final"
  );
  const thirdPlaceMatches = snapshot.matches.filter(
    (match) => match.phase === "third_place"
  );
  const finalRoundMatches = [...finalMatches, ...thirdPlaceMatches];
  const finalMostPicked =
    snapshot.mostPickedByRound[String(FINAL_EXTERNAL_ROUND_ID)] ?? [];
  const shouldShowRound =
    snapshot.availableRounds.includes(FINAL_EXTERNAL_ROUND_ID) &&
    finalRoundMatches.some((match) => match.state !== "scheduled");
  const visibleFinalMatches = shouldShowRound ? finalMatches : [];
  const visibleThirdPlaceMatches = shouldShowRound ? thirdPlaceMatches : [];
  const visibleMatches = [...visibleFinalMatches, ...visibleThirdPlaceMatches];

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Final"
        completedMatches={
          visibleMatches.filter((match) => match.state !== "scheduled").length
        }
        totalMatches={2}
        previousPhaseLink={{
          href: "/semi-final",
          label: "Voltar para a semi-final"
        }}
        nextPhaseDisabled
      />

      <section className="card second-phase-page">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Finalistas</h2>
          </div>
        </div>
        {visibleFinalMatches.length > 0 ? (
          <MatchCards matches={visibleFinalMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Final ainda indisponivel"
            description="O confronto aparece aqui quando a rodada da final estiver valendo."
          />
        )}
      </section>

      <section className="card second-phase-page">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Disputa de 3o lugar</h2>
          </div>
        </div>
        {visibleThirdPlaceMatches.length > 0 ? (
          <MatchCards matches={visibleThirdPlaceMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Disputa de 3o lugar ainda indisponivel"
            description="O confronto entre os perdedores da semi-final aparece aqui quando a rodada da final estiver valendo."
          />
        )}
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
        </div>
        {shouldShowRound && finalMostPicked.length > 0 ? (
          <MostPickedList players={finalMostPicked.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalacoes para a final"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
