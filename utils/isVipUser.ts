/** VIP actif uniquement si is_vip est explicitement vrai (pas subscription_platform seul). */
export function isVipUserRecord(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!data) {
    return false;
  }

  return data.is_vip === true || Number(data.is_vip) === 1;
}
