import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { GroupSelector } from "@/components/public/GroupSelector";
import { MatchCards } from "@/components/public/MatchCards";
import { RoundSelector } from "@/components/public/RoundSelector";
import { StandingsTable } from "@/components/public/StandingsTable";
import { GroupViewService } from "@/server/services/group-view.service";

export const dynamic = "force-dynamic";

const groupViewService = new GroupViewService();

export default async function GroupDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ round?: string }>;
}) {
  const { groupId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const groupView = await groupViewService.getGroup(
    groupId,
    resolvedSearchParams?.round
  );

  return (
    <main className="shell public-home">
      <section className="card public-page">
        <div className="card__header public-home__section-header">
          <div>
            <h1 className="card__title">Grupo {groupView.groupId}</h1>
            <span className="muted">
              Visao detalhada da classificacao oficial e dos confrontos por rodada
            </span>
          </div>
          <Link href="/" className="text-link">
            voltar para o painel
          </Link>
        </div>
        <GroupSelector
          groups={groupView.groups}
          activeGroupCode={groupView.groupId}
          basePath="/grupos"
          pathMode="segment"
        />
      </section>

      <section className="public-page__grid">
        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Tabela atual</h2>
              <span className="muted">
                Oficial acumulada ate a {groupView.standingsRoundLabel}
              </span>
            </div>
          </div>
          {groupView.standings.length > 0 ? (
            <StandingsTable standings={groupView.standings} />
          ) : (
            <EmptyState
              title="Sem dados do grupo"
              description="Nenhuma classificacao foi encontrada para este grupo."
            />
          )}
        </article>

        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Confrontos do grupo</h2>
              <span className="muted">
                Selecione a rodada para ver agenda, parcial ou oficial
              </span>
            </div>
          </div>
          <RoundSelector
            activeRoundNumber={groupView.selectedRoundNumber}
            rounds={groupView.availableRounds}
            basePath={`/grupos/${groupView.groupId}`}
          />
          <div style={{ height: 18 }} />
          {groupView.matches.length > 0 ? (
            <MatchCards matches={groupView.matches} />
          ) : (
            <EmptyState
              title="Sem jogos disponiveis"
              description="Os confrontos desta rodada ainda nao foram publicados."
            />
          )}
        </article>
      </section>
    </main>
  );
}
