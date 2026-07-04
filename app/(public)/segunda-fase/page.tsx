import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const ROUND_OF_16_EXTERNAL_ROUND_ID = 5;

export default async function SecondPhasePage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const secondPhaseMatches = snapshot.matches.filter((match) => match.phase === "round_of_32");
  const secondPhaseMostPicked = snapshot.mostPickedByRound["4"] ?? [];
  const roundOf16Matches = snapshot.matches.filter((match) => match.phase === "round_of_16");
  const roundOf16Available =
    snapshot.availableRounds.includes(ROUND_OF_16_EXTERNAL_ROUND_ID) && roundOf16Matches.length > 0;

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Segunda Fase"
        completedMatches={secondPhaseMatches.filter((match) => match.state !== "scheduled").length}
        totalMatches={16}
        previousPhaseLink={{ href: "/fase-de-grupos", label: "Voltar para a fase de grupos" }}
        nextPhaseLink={
          roundOf16Available
            ? { href: "/oitavas-de-final", label: "Ir para as oitavas de final" }
            : undefined
        }
        nextPhaseDisabled={!roundOf16Available}
      />

      <section className="card second-phase-page">
        {secondPhaseMatches.length > 0 ? (
          <MatchCards matches={secondPhaseMatches} showBadge={false} />
        ) : (
          <EmptyState
            title="Segunda fase ainda nao gerada"
            description="Os confrontos aparecerao aqui depois que o administrador gerar os 16 avos com a classificacao final."
          />
        )}
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
        </div>
        {secondPhaseMostPicked.length > 0 ? (
          <MostPickedList players={secondPhaseMostPicked.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalações para a segunda fase"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
