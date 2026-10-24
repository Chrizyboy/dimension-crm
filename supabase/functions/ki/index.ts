// Edge Function «ki» (Phase 13): alle KI-Funktionen des CRM über die Claude API. Der Schlüssel liegt nur hier
// (Secret ANTHROPIC_API_KEY), Modelle, Preise und Tageslimit in der Einstellung «ki». Vor jedem Aufruf wird das
// Tageslimit geprüft, danach werden die Kosten protokolliert. Die KI schlägt vor; gespeichert oder gesendet wird
// in der App erst nach dem Klick eines Menschen. Siehe Entscheid 0024.

import { dienst } from '../_shared/datenbank.ts'
import { starte } from '../_shared/funktion.ts'
import { kiEingerichtet, kiEinstellung } from '../_shared/ki_rahmen.ts'
import { briefing, leadBewertung, zusammenfassung } from './bewerten.ts'
import { beleg, luftbild, mailErkennen, notiz, offertePdf } from './lesen.ts'
import { entwurf, marketingText, monatsbericht, social, stilLernen } from './texte.ts'

starte({
  status: {
    recht: 'basis',
    f: async (_e, ich) => {
      const cfg = await kiEinstellung()
      return {
        eingerichtet: kiEingerichtet(),
        aktiv: cfg.aktiv,
        budget: await dienst.rpc('ki_budget', { p_person: ich.id }),
        modelle: cfg.modelle,
      }
    },
  },
  entwurf: { recht: 'basis', f: entwurf },
  stil_lernen: { recht: 'basis', f: stilLernen },
  marketing_text: { recht: 'basis', f: marketingText },
  social: { recht: 'basis', f: social },
  monatsbericht: { recht: 'basis', f: monatsbericht },
  mail_erkennen: { recht: 'basis', f: mailErkennen },
  notiz: { recht: 'basis', f: notiz },
  beleg: { recht: 'basis', f: beleg },
  offerte_pdf: { recht: 'basis', f: offertePdf },
  luftbild: { recht: 'basis', f: luftbild },
  zusammenfassung: { recht: 'basis', f: zusammenfassung },
  lead_bewertung: { recht: 'basis', f: leadBewertung },
  briefing: { recht: 'basis', f: briefing },
})
