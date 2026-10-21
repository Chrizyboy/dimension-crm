/** Ist auf diesem Gerät die Cmd-Taste (Mac/iPhone) statt Ctrl üblich? Nur für die Anzeige. */
export function istApple(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
}

/** Anzeige eines Kürzels passend zum Gerät, z.B. «Ctrl K» oder «⌘ K». */
export function kuerzelText(taste: string): string {
  return `${istApple() ? '⌘' : 'Ctrl'} ${taste.toUpperCase()}`
}

/** Prüft, ob ein Tastendruck Ctrl/Cmd + taste ist (ohne Shift/Alt). */
export function istKuerzel(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  taste: string,
): boolean {
  return (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === taste
}
