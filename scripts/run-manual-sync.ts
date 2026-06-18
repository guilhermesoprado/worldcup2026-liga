import { SyncService } from "@/server/services/sync.service";

async function main() {
  const service = new SyncService();
  const result = await service.runManualSync();
  const status = await service.getAdminStatus();

  console.log(
    JSON.stringify(
      {
        syncResult: result,
        latestExecution: status.latestExecution,
        currentRound: status.currentRound,
        officialRound: status.officialRound,
        lastSyncedRound: status.lastSyncedRound
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
