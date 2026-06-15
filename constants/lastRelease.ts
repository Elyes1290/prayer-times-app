const LAST_RELEASE_DATE = "2026-06-15";

export function formatLastUpdateDate(language: string): string {
  return new Date(LAST_RELEASE_DATE).toLocaleDateString(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
