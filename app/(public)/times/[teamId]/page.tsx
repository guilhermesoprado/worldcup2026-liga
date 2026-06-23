import { EmptyState } from "@/components/public/EmptyState";
import { TeamDetailView } from "@/components/public/TeamDetailView";
import { TeamDetailService } from "@/server/services/team-detail.service";
import type { PublicTeamDetail } from "@/types/public";

export const dynamic = "force-dynamic";

const teamDetailService = new TeamDetailService();

function isPublicTeamDetail(detail: unknown): detail is PublicTeamDetail {
  return Boolean(
    detail &&
      typeof detail === "object" &&
      "participantId" in detail &&
      typeof (detail as { participantId?: unknown }).participantId === "string"
  );
}

export default async function TeamDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ round?: string }>;
}) {
  const { teamId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const detail = await teamDetailService.getTeamDetail(teamId, resolvedSearchParams?.round);

  if (!isPublicTeamDetail(detail)) {
    return (
      <main className="shell public-home">
        <section className="card public-page">
          <EmptyState
            title="Time nao encontrado"
            description="Nao foi possivel localizar o participante solicitado."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="shell public-home">
      <TeamDetailView detail={detail} />
    </main>
  );
}
