import { DeviceEventEmitter } from "react-native";
import { addPlaybackDebugLog } from "./playbackDebugLogs";

/** Logs seek — console + écran debug (Paramètres → Debug notifications) */
export function logQuranSeek(
  stage: string,
  details: Record<string, unknown> = {},
): void {
  const summary = Object.entries(details)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  const message = `[Seek] ${stage}${summary ? ` | ${summary}` : ""}`;

  console.log(message);

  void addPlaybackDebugLog(stage, details);

  DeviceEventEmitter.emit("AddPlaybackDebugLog", {
    message,
    type: "info",
    details,
  });
}
