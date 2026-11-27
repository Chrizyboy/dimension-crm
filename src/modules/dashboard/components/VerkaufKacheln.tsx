import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { quote, summe } from '../lib/auswertung'
import { franken } from '../lib/format'
import { von } from '../lib/verkauf'
import { Kpi } from './Kpi'
import type { ReiterProps } from './reiterProps'

/**
 * Die fünf Verkaufszahlen aus dem alten CRM (V234): neue Leads, Offerten gesendet, angenommen, Abschlussquote und
 * Nachfassen fällig. Gleich im Start und im Reiter «Verkauf», damit die Zahlen überall übereinstimmen.
 */
export function VerkaufKacheln(p: ReiterProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { fakten, vorher } = p
  const anzahl = (s: string) => von(fakten, s).length
  const vgl = (s: string) =>
    vorher ? { text: `${p.vergleichName} ${String(von(vorher, s).length)}`, wert: von(vorher, s).length } : null
  const entschieden = [...von(fakten, 'angenommen'), ...von(fakten, 'verloren')]
  const q = quote(entschieden)
  const qVorher = vorher ? quote([...von(vorher, 'angenommen'), ...von(vorher, 'verloren')]) : null
  const angenommen = von(fakten, 'angenommen')
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="kz-kacheln">
      <Kpi
        titel={t('kz.kachel.leads')}
        wert={String(anzahl('leads_neu'))}
        zahl={anzahl('leads_neu')}
        vergleich={vgl('leads_neu')}
        onKlick={() => {
          p.onDetail({ titel: t('kz.kachel.leads'), fakten: von(fakten, 'leads_neu') })
        }}
      />
      <Kpi
        titel={t('kz.kachel.gesendet')}
        wert={String(anzahl('gesendet'))}
        zahl={anzahl('gesendet')}
        vergleich={vgl('gesendet')}
        unter={franken(summe(von(fakten, 'gesendet')))}
        onKlick={() => {
          p.onDetail({ titel: t('kz.kachel.gesendet'), fakten: von(fakten, 'gesendet') })
        }}
      />
      <Kpi
        titel={t('kz.kachel.angenommen')}
        wert={String(angenommen.length)}
        zahl={angenommen.length}
        vergleich={vgl('angenommen')}
        unter={t('kz.k.schnitt', { wert: franken(angenommen.length ? summe(angenommen) / angenommen.length : 0) })}
        onKlick={() => {
          p.onDetail({ titel: t('kz.kachel.angenommen'), fakten: angenommen })
        }}
      />
      <Kpi
        titel={t('kz.kachel.quote')}
        wert={q === null ? '–' : `${String(q)} %`}
        zahl={q}
        vergleich={
          vorher
            ? { text: `${p.vergleichName} ${qVorher === null ? '–' : `${String(qVorher)} %`}`, wert: qVorher }
            : null
        }
        unter={t('kz.kachel.quoteHinweis', { n: entschieden.length })}
        onKlick={() => {
          p.onDetail({ titel: t('kz.kachel.quote'), fakten: entschieden })
        }}
      />
      <Kpi
        titel={t('kz.kachel.nachfassen')}
        wert={String(anzahl('nf_faellig'))}
        unter={t('kz.kachel.nachfassenHinweis')}
        onKlick={() => void navigate({ to: '/quotes', search: { ansicht: 'nachfassen' } })}
      />
    </div>
  )
}
