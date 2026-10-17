// hooks/useIsFriday.ts
//
// Vrai le vendredi (ou tous les jours si l'interrupteur de test est actif).
// Se met à jour au retour au premier plan, car le jour a pu changer.

import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { isFriday } from "../utils/friday/reminders";

export function useIsFriday(): boolean {
  const [friday, setFriday] = useState(() => isFriday(new Date()));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setFriday(isFriday(new Date()));
    });
    return () => subscription.remove();
  }, []);

  return friday;
}
