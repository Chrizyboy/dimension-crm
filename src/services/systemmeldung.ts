import { istDesktopApp } from '@/lib/plattform'

/** Schon gezeigte Pop-ups (über Neustarts hinweg), damit dieselbe Meldung nie zweimal aufspringt. */
const GEZEIGT = 'crm.systemmeldungen'

function gezeigt(): string[] {
  try {
    const roh = localStorage.getItem(GEZEIGT)
    return roh ? (JSON.parse(roh) as string[]) : []
  } catch {
    return []
  }
}

/**
 * Zeigt Meldungen der Glocke mit «popup» (z. B. «T014 wartet auf dich») als Windows-Systemmeldung, aber nur in der
 * Desktop-App und je Meldung einmal. Im Browser und am Handy kommt dafür die SMS.
 */
export async function zeigeSystemmeldungen(neue: { id: string; titel: string; text?: string }[]): Promise<void> {
  if (!istDesktopApp() || neue.length === 0) return
  const schon = gezeigt()
  const offen = neue.filter((n) => !schon.includes(n.id))
  if (offen.length === 0) return
  try {
    localStorage.setItem(GEZEIGT, JSON.stringify([...offen.map((n) => n.id), ...schon].slice(0, 200)))
  } catch {
    // Ohne Speicher springt eine Meldung nach einem Neustart vielleicht nochmals auf; das ist harmlos.
  }
  const { invoke } = await import('@tauri-apps/api/core')
  for (const n of offen) {
    await invoke('plugin:notification|notify', { options: { title: n.titel, body: n.text ?? '' } }).catch(() => {
      // Systemmeldungen ausgeschaltet: die Glocke zeigt die Meldung trotzdem.
    })
  }
}
