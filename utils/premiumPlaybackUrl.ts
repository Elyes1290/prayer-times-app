/**
 * URL de lecture premium : action=stream (HTTP Range + seek).
 * Les MP3 doivent être encodés avec -write_xing 1 (cf. scripts/fix-quran-mp3.ps1).
 */
export function toPremiumStreamPlaybackUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//"))
  ) {
    return url;
  }

  let out = trimmed;
  if (out.includes("action=download")) {
    out = out.replace(/action=download/g, "action=stream");
  } else if (!out.includes("action=")) {
    out += out.includes("?") ? "&action=stream" : "?action=stream";
  }
  return out;
}

/** @deprecated Utiliser toPremiumStreamPlaybackUrl — conservé pour compat imports */
export const toPremiumNativePlaybackUrl = toPremiumStreamPlaybackUrl;
