/**
 * Adresse eines Datensatzes in der App, für Links aus Aufgaben, Benachrichtigungen und dem Protokoll der
 * Automationen. Dieselbe Zuordnung hat die Datenbank in intern.automation_ziel; hier nur für die Anzeige.
 */
export function zielVon(tabelle: string | null | undefined, id: string | null | undefined): string | null {
  if (!tabelle || !id) return null
  const pfad: Record<string, string> = {
    verkaufschancen: `/sales?lead=${id}`,
    offerten: `/quotes?offerte=${id}`,
    projekte: `/projects?projekt=${id}`,
    rechnungen: `/invoices?rechnung=${id}`,
    wartungsvertraege: '/aftersales?reiter=wartung',
    service_faelle: `/aftersales?fall=${id}`,
    kontakte: `/customers?kunde=${id}`,
    ausgangskorb: `/outbox?eintrag=${id}`,
    ausschreibungen: `/tenders?dossier=${id}`,
  }
  return pfad[tabelle] ?? null
}

/** Nur Adressen innerhalb der App («/…») öffnen; externe Ziele (SharePoint) gehen in ein neues Fenster. */
export function istAppZiel(ziel: string): boolean {
  return ziel.startsWith('/') && !ziel.startsWith('//')
}
