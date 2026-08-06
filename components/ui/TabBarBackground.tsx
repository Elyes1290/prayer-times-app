// This is a shim for web and Android where the tab bar is generally opaque.
// react-doctor-disable-next-line deslop/unused-export -- résolu via l'extension de plateforme (.ios.tsx), invisible pour l'analyse statique
export function useBottomTabOverflow() {
  return 0;
}
