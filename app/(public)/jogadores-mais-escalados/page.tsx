import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { MostPickedList } from "@/components/public/MostPickedList";
import { RoundSelector } from "@/components/public/RoundSelector";
import { MostPickedService } from "@/server/services/most-picked.service";

export const dynamic = "force-dynamic";

const mostPickedService = new MostPickedService();

export default async function MostPickedPage({
  searchParams
}: {
  searchParams?: Promise<{ round?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const mostPicked = await mostPickedService.getMostPicked(
    resolvedSearchParams?.round
  );

  return (
    <main className="shell public-home">
      <section className="card public-page">
        <div className="card__header public-home__section-header">
          <div>
            <h1 className="card__title">Jogadores mais escalados</h1>
            <span className="muted">
              Ranking por rodada, contando titulares e substituicoes efetivas
            </span>
          </div>
          <Link href="/" className="text-link">
            voltar ao painel
          </Link>
        </div>
        <RoundSelector
          activeRoundNumber={Number(mostPicked.roundId)}
          rounds={mostPicked.availableRounds}
          basePath="/jogadores-mais-escalados"
        />
        <div style={{ height: 18 }} />
        {mostPicked.athletes.length > 0 ? (
          <MostPickedList players={mostPicked.athletes} />
        ) : (
          <EmptyState
            title="Sem jogadores contabilizados"
            description="Esta rodada ainda nao possui escalações efetivamente computadas pelo Cartola."
          />
        )}
      </section>
    </main>
  );
}
