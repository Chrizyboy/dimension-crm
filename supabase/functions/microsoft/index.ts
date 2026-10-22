// Edge Function «microsoft»: alles, was die App mit Microsoft 365 tut, immer im Namen der angemeldeten Person.
// Aktionen: verbinden, trennen, testen, kalender_laden, mails_abgleichen, anfragen_abholen,
// termin_eintragen, termin_absagen, sharepoint_sichern (alle offenen oder nur dokument_ids).
// Die Person braucht eine eigene Microsoft-Verbindung.

import { anfragenAbholen, kalenderAbgleichen, mailsAbgleichen, msEinstellungen } from '../_shared/abgleich.ts'
import { dienst, gemessen } from '../_shared/datenbank.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { anmeldeAdresse, graph, trennen } from '../_shared/microsoft.ts'
import { dokumentSichern, type SicherungsDokument } from '../_shared/sharepoint.ts'
import { terminAbsagen, terminEintragen } from '../_shared/termin.ts'
import { brauche } from '../_shared/umgebung.ts'

starte({
  verbinden: {
    recht: 'basis',
    f: async (e, ich) => {
      brauche('MS_CLIENT_SECRET')
      brauche('VERBINDUNG_SCHLUESSEL')
      return { adresse: await anmeldeAdresse(ich.id, ich.email, e.sprache === 'fr' ? 'fr' : 'de') }
    },
  },
  trennen: { recht: 'basis', f: async (_e, ich) => ({ getrennt: Boolean(await trennen(ich.id)) || true }) },
  testen: {
    recht: 'basis',
    f: (_e, ich) =>
      gemessen('microsoft', 'testen', ich.id, async () => {
        const me = await graph<{ mail?: string; userPrincipalName?: string }>(
          ich.id,
          '/me?$select=mail,userPrincipalName',
        )
        return { konto: me.mail ?? me.userPrincipalName ?? '' }
      }),
  },
  kalender_laden: {
    recht: 'basis',
    f: async (e, ich) => {
      const s = await msEinstellungen()
      const tage = Math.min(90, Math.max(1, Number(e.tage ?? s.kalender_tage ?? 21)))
      return { anzahl: await gemessen('microsoft', 'kalender', ich.id, () => kalenderAbgleichen(ich.id, tage)) }
    },
  },
  mails_abgleichen: {
    recht: 'basis',
    f: async (_e, ich) => {
      const s = await msEinstellungen()
      const n = await gemessen('microsoft', 'mails', ich.id, () =>
        mailsAbgleichen(ich.id, s.mail_tage ?? 7, s.team_postfaecher ?? []),
      )
      return { anzahl: n }
    },
  },
  anfragen_abholen: {
    recht: 'basis',
    f: async (_e, ich) =>
      gemessen('microsoft', 'anfragen', ich.id, async () => anfragenAbholen(ich.id, await msEinstellungen())),
  },
  termin_eintragen: {
    recht: 'basis',
    f: (e, ich) =>
      gemessen('microsoft', 'termin', ich.id, () =>
        terminEintragen(ich, {
          verkaufschance_id: textFeld(e, 'verkaufschance_id'),
          betreff: typeof e.betreff === 'string' ? e.betreff : '',
          text: typeof e.text === 'string' ? e.text : '',
          kunde_einladen: e.kunde_einladen === true,
        }),
      ).then((outlook) => ({ outlook })),
  },
  termin_absagen: {
    recht: 'basis',
    f: async (e, ich) => {
      await gemessen('microsoft', 'termin_absagen', ich.id, () => terminAbsagen(ich, textFeld(e, 'verkaufschance_id')))
      return {}
    },
  },
  sharepoint_sichern: {
    recht: 'basis',
    f: async (e, ich) => {
      const s = await msEinstellungen()
      const ids = Array.isArray(e.dokument_ids) ? e.dokument_ids.map(String) : null
      const offen = await dienst.rpc<SicherungsDokument[]>('sicherung_offen', { p_limit: 20, p_ids: ids })
      let gesichert = 0
      for (const d of offen) if (await dokumentSichern(ich.id, s, d)) gesichert++
      return { gesichert, fehler: offen.length - gesichert }
    },
  },
})
