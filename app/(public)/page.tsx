import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { GroupSelector } from "@/components/public/GroupSelector";
import { MatchCards } from "@/components/public/MatchCards";
import { MostPickedList } from "@/components/public/MostPickedList";
import { PhaseHero } from "@/components/public/PhaseHero";
import { RoundSelector } from "@/components/public/RoundSelector";
import { StandingsTable } from "@/components/public/StandingsTable";
import { PublicOverviewService } from "@/server/services/public-overview.service";

export const dynamic = "force-dynamic";

const overviewService = new PublicOverviewService();

function formatRoundLabel(roundNumber: number) {
  return `${roundNumber}ª rodada`;
}

export default async function PublicHomePage({
  searchParams
}: {
  searchParams?: Promise<{ round?: string; group?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const overview = await overviewService.getOverview(
    resolvedSearchParams?.round,
    resolvedSearchParams?.group
  );

  return (
    <main className="shell public-home">
      <PhaseHero
        title={overview.phaseLabel}
        completedMatches={overview.completedMatches}
        totalMatches={overview.totalMatches}
      />

      <section className="card public-home__group-card">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Selecione o grupo</h2>
            <span className="muted">12 grupos definidos para a fase inicial</span>
          </div>
          <div className="section-actions">
            <Link href={`/confrontos?round=${overview.selectedRoundNumber}`} className="text-link">
              ver todos os confrontos
            </Link>
          </div>
        </div>
        <GroupSelector
          groups={overview.groups}
          activeGroupCode={overview.activeGroupCode}
          selectedRoundNumber={overview.selectedRoundNumber}
        />
      </section>

      <section className="public-home__content-grid">
        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Classificação · Grupo {overview.activeGroupCode}</h2>
            </div>
          </div>
          {overview.activeGroupStandings.length > 0 ? (
            <StandingsTable
              standings={overview.activeGroupStandings}
              roundNumber={overview.standingsRoundNumber}
            />
          ) : (
            <EmptyState
              title="Sem classificação disponível"
              description="A classificação aparecerá quando houver confrontos processados."
            />
          )}
        </article>

        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Confrontos · {formatRoundLabel(overview.selectedRoundNumber)}</h2>
            </div>
          </div>
          <RoundSelector
            activeRoundNumber={overview.selectedRoundNumber}
            rounds={overview.availableRounds}
            activeGroupCode={overview.activeGroupCode}
          />
          <div style={{ height: 18 }} />
          <MatchCards matches={overview.currentRoundMatches} />
        </article>
      </section>

      <section className="card public-home__panel public-home__panel--wide">
        <div className="card__header public-home__section-header">
          <div>
            <h2 className="card__title">Jogadores mais escalados</h2>
          </div>
          <Link
            href={`/jogadores-mais-escalados?round=${overview.selectedRoundNumber}`}
            className="text-link"
          >
            ranking das rodadas
          </Link>
        </div>
        {overview.mostPickedPlayers.length > 0 ? (
          <MostPickedList players={overview.mostPickedPlayers.slice(0, 7)} />
        ) : (
          <EmptyState
            title="Sem escalações para esta rodada"
            description="O ranking aparece quando a rodada tiver jogadores efetivamente contabilizados pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
