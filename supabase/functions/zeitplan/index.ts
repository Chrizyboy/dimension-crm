// Edge Function «zeitplan»: pg_cron ruft sie jede Minute auf (intern.zeitplan_anstossen). Ohne Supabase-Login,
// geschützt durch den Schlüssel ZEITPLAN_SCHLUESSEL im Kopf. Jeder Job läuft nur, wenn er fällig ist
// (zeitplan_faellig sperrt ihn gleich, damit er nie doppelt läuft), und meldet sein Ergebnis.
//  * ausgang      jede Minute     freigegebene Mails und SMS senden
//  * sms          ab «uhrzeit»    SMS-Erinnerungen für morgen, nur wenn «automatisch» eingeschaltet ist (V172)
//  * anfragen     alle 5 Minuten  solar-guide, Landingpage, Messe aus den Postfächern (V78)
//  * kalender     alle 15 Min.    Outlook-Kalender aller verbundenen Personen (V231)
//  * mails        alle 15 Min.    Mail-Verlauf mit Kunden (V81/V227)
//  * sicherung    alle 30 Min.    Kundendateien in SharePoint sichern (V64)
//  * simap        06:52, 12:00, 17:00   neue Ausschreibungen und Zuschläge (Phase 8b, Zeiten in den Einstellungen)
//  * amtsblatt    06:52 Mo–Sa     Baugesuche aus dem Amtsblattportal
//  * ausschreibungen_pruefen 07:00  Auslöser, Nachfassen, Erinnerungen, Quellen-Kontrolle

import { faelligesFenster, monitorEinstellungen, quelleLesen } from '../_shared/ausschreibungen.ts'
import { anfragenAbholen, kalenderAbgleichen, mailsAbgleichen, msEinstellungen } from '../_shared/abgleich.ts'
import { antwort } from '../_shared/antwort.ts'
import { dienst } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import { dokumentSichern, type SicherungsDokument } from '../_shared/sharepoint.ts'
import { eingerichtet, env } from '../_shared/umgebung.ts'
import { ausgangAbarbeiten } from '../_shared/versand.ts'
import { utcZuZuerich } from '../_shared/outlook.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

/** Vergleicht zwei Texte in gleichbleibender Zeit (Schutz gegen Raten über die Antwortzeit). */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Führt einen Job aus, wenn er fällig ist, und hält das Ergebnis fest. */
async function job(name: string, minuten: number, f: () => Promise<string>): Promise<string> {
  if (!(await dienst.rpc<boolean>('zeitplan_faellig', { p_job: name, p_minuten: minuten }))) return 'nicht fällig'
  try {
    const meldung = await f()
    await dienst.rpc('zeitplan_ergebnis', { p_job: name, p_ok: true, p_meldung: meldung })
    return meldung
  } catch (f) {
    const code = f instanceof DienstFehler ? f.code : f instanceof Error ? f.message.split(':')[0]! : 'fehler'
    await dienst.rpc('zeitplan_ergebnis', { p_job: name, p_ok: false, p_meldung: code })
    return `fehler: ${code}`
  }
}

/** Für jede verbundene Person f ausführen; Fehler einer Person halten die anderen nicht auf. */
async function fuerAlle(f: (personId: string) => Promise<number>): Promise<string> {
  const personen = await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})
  let n = 0
  let fehler = 0
  for (const p of personen) {
    try {
      n += await f(p.person_id)
    } catch {
      fehler++
    }
  }
  const anzahl = (z: number, eins: string, viele: string) => `${z} ${z === 1 ? eins : viele}`
  return `${anzahl(personen.length, 'Person', 'Personen')}, ${anzahl(n, 'Eintrag', 'Einträge')}${fehler ? `, ${fehler} Fehler` : ''}`
}

Deno.serve(async (req) => {
  const schluessel = env('ZEITPLAN_SCHLUESSEL')
  if (!schluessel || !gleich(req.headers.get('x-zeitplan-schluessel') ?? '', schluessel)) {
    return antwort(401, { ok: false, fehler: 'schluessel' })
  }
  const ein = eingerichtet()
  const ergebnis: Record<string, string> = {}

  ergebnis.ausgang = await job('ausgang', 0, async () => {
    const r = await ausgangAbarbeiten(20)
    return `${r.gesendet} gesendet, ${r.fehler} Fehler`
  })

  // SMS-Erinnerung für morgen ab der eingestellten Uhrzeit (Ortszeit Zürich); die Datenbank prüft «automatisch».
  const [sms] = await dienst.lies<{ wert: { uhrzeit?: string } }[]>(
    'einstellungen?schluessel=eq.sms_erinnerung&select=wert',
  )
  const jetzt = utcZuZuerich(new Date().toISOString())
  if (ein.sms && jetzt.slice(11, 16) >= (sms?.wert.uhrzeit ?? '16:00')) {
    ergebnis.sms = await job('sms_erinnerung', 30, async () => {
      const morgen = new Date(Date.parse(`${jetzt.slice(0, 10)}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
      const n = await dienst.rpc<number>('sms_erinnerungen_senden', {
        p_datum: morgen,
        p_leads: null,
        p_automatisch: true,
      })
      if (n) await ausgangAbarbeiten(20)
      return `${n} SMS für ${morgen}`
    })
  }

  // Ausschreibungs-Monitor: jedes Zeitfenster läuft einmal (Job pro Fenster, danach 10 Stunden gesperrt).
  const monitor = await monitorEinstellungen()
  const uhr = jetzt.slice(11, 16)
  const simap = faelligesFenster(monitor.simap_zeiten ?? ['06:52', '12:00', '17:00'], uhr)
  if (simap) {
    ergebnis.simap = await job(`simap ${simap}`, 600, async () => (await quelleLesen('simap')).meldung)
  }
  const wochentag = new Date(`${jetzt.slice(0, 10)}T12:00:00Z`).getUTCDay()
  const amtsblatt = faelligesFenster(monitor.amtsblatt_zeiten ?? ['06:52'], uhr)
  if (amtsblatt && wochentag !== 0) {
    ergebnis.amtsblatt = await job(`amtsblatt ${amtsblatt}`, 600, async () => (await quelleLesen('amtsblatt')).meldung)
  }
  if (faelligesFenster([monitor.pruefen_zeit ?? '07:00'], uhr)) {
    ergebnis.ausschreibungen = await job('ausschreibungen_pruefen', 600, async () => {
      const r = await dienst.rpc<Record<string, number>>('ausschreibungen_pruefen', {})
      return Object.entries(r)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ')
    })
  }

  if (ein.microsoft) {
    const s = await msEinstellungen()
    ergebnis.anfragen = await job('anfragen', 5, async () => {
      // Eine Person reicht; wer keinen Zugriff auf info@ hat, wird übersprungen.
      const personen = await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})
      for (const p of personen) {
        try {
          const r = await anfragenAbholen(p.person_id, s)
          if (r.postfach_anfragen !== 'kein_zugriff' || p === personen.at(-1)) {
            return `${r.neu} neu, ${r.ergaenzt} ergänzt, ${r.geloescht} gelöscht, info@: ${r.postfach_anfragen}`
          }
        } catch {
          /* nächste Person versuchen */
        }
      }
      return 'keine verbundene Person'
    })
    ergebnis.kalender = await job('kalender', 15, () => fuerAlle((id) => kalenderAbgleichen(id, s.kalender_tage ?? 21)))
    ergebnis.mails = await job('mails', 15, async () => {
      let team = s.team_postfaecher ?? []
      return fuerAlle(async (id) => {
        const n = await mailsAbgleichen(id, 1, team)
        team = [] // Team-Postfächer nur einmal pro Lauf lesen
        return n
      })
    })
    ergebnis.sicherung = await job('sicherung', 30, async () => {
      const [p] = await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})
      if (!p) return 'keine verbundene Person'
      const offen = await dienst.rpc<SicherungsDokument[]>('sicherung_offen', { p_limit: 10, p_ids: null })
      let ok = 0
      for (const d of offen) if (await dokumentSichern(p.person_id, s, d)) ok++
      return `${ok} von ${offen.length} gesichert`
    })
  }
  return antwort(200, { ok: true, ergebnis })
})
