import { EmptyState } from "@/components/public/EmptyState";
import { PhaseHero } from "@/components/public/PhaseHero";
import { SecondPhaseBracket } from "@/components/public/SecondPhaseBracket";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();

export default async function SecondPhasePage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const secondPhaseMatches = snapshot.matches.filter((match) => match.phase === "round_of_32");

  return (
    <main className="shell public-home">
      <PhaseHero
        title="Segunda Fase"
        completedMatches={secondPhaseMatches.filter((match) => match.state !== "scheduled").length}
        totalMatches={16}
        previousPhaseLink={{ href: "/fase-de-grupos", label: "Voltar para a fase de grupos" }}
        nextPhaseDisabled
      />

      <section className="card second-phase-page">
        {secondPhaseMatches.length > 0 ? (
          <SecondPhaseBracket matches={secondPhaseMatches} />
        ) : (
          <EmptyState
            title="Segunda fase ainda nao gerada"
            description="Os confrontos aparecerao aqui depois que o administrador gerar os 16 avos com a classificacao final."
          />
        )}
      </section>
    </main>
  );
}
