export type PremiumAppearanceResetOptions = {
  /** Ignore le statut premium en cache (déconnexion / expiration). */
  force?: boolean;
};

type PremiumAppearanceResetHandler = (
  options?: PremiumAppearanceResetOptions,
) => void | Promise<void>;

type NotificationReprogramHandler = () => void | Promise<void>;
type BackupSignOutHandler = () => void | Promise<void>;

let resetHandler: PremiumAppearanceResetHandler | null = null;
let notificationReprogramHandler: NotificationReprogramHandler | null = null;
let backupSignOutHandler: BackupSignOutHandler | null = null;

let reprogramInFlight: Promise<void> | null = null;
let lastReprogramAt = 0;
const REPROGRAM_MIN_INTERVAL_MS = 5000;

export function registerPremiumAppearanceReset(
  handler: PremiumAppearanceResetHandler | null,
): void {
  resetHandler = handler;
}

export function registerNotificationReprogram(
  handler: NotificationReprogramHandler | null,
): void {
  notificationReprogramHandler = handler;
}

export async function runPremiumAppearanceReset(
  options?: PremiumAppearanceResetOptions,
): Promise<void> {
  if (!resetHandler) {
    return;
  }

  await resetHandler(options);
}

export async function runNotificationReprogram(): Promise<void> {
  if (!notificationReprogramHandler) {
    return;
  }

  const now = Date.now();
  if (reprogramInFlight) {
    return reprogramInFlight;
  }
  if (now - lastReprogramAt < REPROGRAM_MIN_INTERVAL_MS) {
    return;
  }

  lastReprogramAt = now;
  reprogramInFlight = (async () => {
    try {
      await notificationReprogramHandler!();
    } finally {
      reprogramInFlight = null;
    }
  })();

  return reprogramInFlight;
}

export function registerBackupSignOut(
  handler: BackupSignOutHandler | null,
): void {
  backupSignOutHandler = handler;
}

export async function runBackupSignOut(): Promise<void> {
  if (!backupSignOutHandler) {
    return;
  }

  await backupSignOutHandler();
}
