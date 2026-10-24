import type { KiMailErgebnis } from '@/services/ki'
import type { LeadEingabe } from '../schema'

/**
 * Lead-Felder aus einer Mail, die die KI gelesen hat. Nur Werte aus den Auswahllisten werden übernommen;
 * die Person sieht alles im Formular und speichert selbst.
 */
export function leadAusMail(
  r: KiMailErgebnis,
  erlaubt: { interesse: string[]; gebaeudeart: string[]; dachform: string[] },
): Partial<LeadEingabe> {
  const e = r.erkannt
  const k = e.kontakt
  const email = k.email ?? /<([^>]+)>/.exec(r.mail.von)?.[1] ?? (r.mail.von.includes('@') ? r.mail.von.trim() : '')
  const interesse = e.lead.interesse.filter((i) => erlaubt.interesse.includes(i))
  const kommentar = [e.lead.kommentar, e.zusammenfassung].filter(Boolean)[0] ?? ''
  return {
    anrede: k.anrede ?? '',
    vorname: k.vorname ?? '',
    nachname: k.nachname ?? k.firma ?? '',
    email: email.toLowerCase(),
    telefon: k.telefon ?? '',
    sprache: e.sprache,
    strasse: e.adresse.strasse ?? '',
    plz: /^\d{4}$/.test(e.adresse.plz ?? '') ? (e.adresse.plz ?? '') : '',
    ort: e.adresse.ort ?? '',
    gebaeudeart: e.lead.gebaeudeart && erlaubt.gebaeudeart.includes(e.lead.gebaeudeart) ? e.lead.gebaeudeart : '',
    dachform: e.lead.dachform && erlaubt.dachform.includes(e.lead.dachform) ? e.lead.dachform : '',
    ...(interesse.length ? { interesse } : {}),
    kommentar: kommentar.slice(0, 4000),
    notiz: `Mail «${r.mail.betreff}» (mit KI gelesen)`.slice(0, 4000),
  }
}
