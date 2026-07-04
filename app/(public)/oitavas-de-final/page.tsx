import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const ROUND_OF_16_EXTERNAL_ROUND_ID = 5;

export default async function RoundOf16Page() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const roundOf16Matches = snapshot.matches.filter((match) => match.phase === "round_of_16");
  const roundOf16MostPicked = snapshot.mostPickedByRound[String(ROUND_OF_16_EXTERNAL_ROUND_ID)] ?? [];
  const shouldShowRound = snapshot.currentRoundNumber >= ROUND_OF_16_EXTERNAL_ROUND_ID;
  const visibleMatches = shouldShowRound ? roundOf16Matches : [];

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Oitavas de Final"
        completedMatches={visibleMatches.filter((match) => match.state !== "scheduled").length}
        totalMatches={8}
        previousPhaseLink={{ href: "/segunda-fase", label: "Voltar para a segunda fase" }}
        nextPhaseDisabled
      />

      <section className="card second-phase-page">
        {visibleMatches.length > 0 ? (
          <MatchCards matches={visibleMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Oitavas de final ainda indisponiveis"
            description="Os confrontos aparecem aqui quando a rodada das oitavas estiver valendo."
          />
        )}
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
        </div>
        {shouldShowRound && roundOf16MostPicked.length > 0 ? (
          <MostPickedList players={roundOf16MostPicked.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalacoes para as oitavas"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
