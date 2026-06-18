import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { MatchCards } from "@/components/public/MatchCards";
import { RoundSelector } from "@/components/public/RoundSelector";
import { MatchesViewService } from "@/server/services/matches-view.service";

export const dynamic = "force-dynamic";

const matchesViewService = new MatchesViewService();

export default async function MatchesPage({
  searchParams
}: {
  searchParams?: Promise<{ round?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const matchesView = await matchesViewService.getMatches(
    "groups",
    resolvedSearchParams?.round
  );

  return (
    <main className="shell public-home">
      <section className="card public-page">
        <div className="card__header public-home__section-header">
          <div>
            <h1 className="card__title">Confrontos da rodada</h1>
            <span className="muted">
              A rodada atual abre por padrao e pode ser filtrada manualmente
            </span>
          </div>
          <Link href="/" className="text-link">
            voltar ao painel
          </Link>
        </div>
        <RoundSelector
          activeRoundNumber={Number(matchesView.roundId)}
          rounds={matchesView.availableRounds}
          basePath="/confrontos"
        />
        <div style={{ height: 18 }} />
        {matchesView.matches.length > 0 ? (
          <MatchCards matches={matchesView.matches} />
        ) : (
          <EmptyState
            title="Sem confrontos para esta rodada"
            description="A API oficial ainda nao publicou jogos validos para a rodada selecionada."
          />
        )}
      </section>
    </main>
  );
}
