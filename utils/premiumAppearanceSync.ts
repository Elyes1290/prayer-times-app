export type PremiumAppearanceResetOptions = {
  /** Ignore le statut premium en cache (déconnexion / expiration). */
  force?: boolean;
};

type PremiumAppearanceResetHandler = (
  options?: PremiumAppearanceResetOptions,
) => void | Promise<void>;

let resetHandler: PremiumAppearanceResetHandler | null = null;

export function registerPremiumAppearanceReset(
  handler: PremiumAppearanceResetHandler | null,
): void {
  resetHandler = handler;
}

export async function runPremiumAppearanceReset(
  options?: PremiumAppearanceResetOptions,
): Promise<void> {
  if (!resetHandler) {
    return;
  }

  await resetHandler(options);
}
