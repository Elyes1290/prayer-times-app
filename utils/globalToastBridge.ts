import type { ToastData } from "../components/Toast";

// Pont global facultatif pour déclencher un toast en dehors de React (ex: utils, services natifs).
// Isolé dans son propre module (plutôt que dans ToastContext.tsx) pour que ce fichier de contexte
// n'exporte que des composants/hooks React (voir react-doctor/only-export-components).
let globalShowToast: ((toast: Omit<ToastData, "id">) => void) | null = null;

export const registerGlobalToast = (
  handler: ((toast: Omit<ToastData, "id">) => void) | null,
) => {
  globalShowToast = handler;
};

export const showGlobalToast = (toast: Omit<ToastData, "id">) => {
  try {
    if (globalShowToast) globalShowToast(toast);
  } catch {}
};
