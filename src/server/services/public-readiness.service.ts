import { PersistedPublicSnapshotService } from "@/server/services/persisted-public-snapshot.service";
import { SyncService } from "@/server/services/sync.service";

export class PublicReadinessService {
  private static inFlightSync: Promise<void> | null = null;

  private readonly persistedPublicSnapshotService = new PersistedPublicSnapshotService();
  private readonly syncService = new SyncService();

  async ensurePublicDataReady() {
    const persistedSnapshot = await this.persistedPublicSnapshotService.getSnapshot();
    const autoSyncAllowed = await this.syncService.shouldRunAccessDrivenSync();

    if (!autoSyncAllowed) {
      return persistedSnapshot ?? (await this.persistedPublicSnapshotService.getSnapshotOrFallback());
    }

    if (!persistedSnapshot) {
      await this.runWithLock(async () => {
        await this.syncService.runManualSync().catch(() => null);
      });
    } else {
      await this.runWithLock(async () => {
        await this.syncService.runAccessDrivenSyncIfDue().catch(() => null);
      });
    }

    return (
      (await this.persistedPublicSnapshotService.getSnapshot()) ??
      persistedSnapshot ??
      (await this.persistedPublicSnapshotService.getSnapshotOrFallback())
    );
  }

  private async runWithLock(task: () => Promise<void>) {
    if (PublicReadinessService.inFlightSync) {
      await PublicReadinessService.inFlightSync;
      return;
    }

    PublicReadinessService.inFlightSync = task().finally(() => {
      PublicReadinessService.inFlightSync = null;
    });

    await PublicReadinessService.inFlightSync;
  }
}
