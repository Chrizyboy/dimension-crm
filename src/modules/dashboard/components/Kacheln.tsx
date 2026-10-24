import { useTranslation } from 'react-i18next'
import { quote, summe } from '../lib/auswertung'
import { franken } from '../lib/format'
import type { Detail, Fakt } from '../types'

/** Eine Kachel: grosse Zahl, kleine Zeile darunter, Klick zeigt die Einträge. */
function Kachel({ titel, zahl, unter, onKlick }: { titel: string; zahl: string; unter?: string; onKlick: () => void }) {
  return (
    <button
      type="button"
      onClick={onKlick}
      className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-1 rounded-lg border p-4 text-left outline-none focus-visible:ring-2"
    >
      <span className="text-muted-foreground text-xs font-medium">{titel}</span>
      <span className="font-display zahlen text-2xl font-semibold">{zahl}</span>
      {unter && <span className="text-muted-foreground zahlen text-xs">{unter}</span>}
    </button>
  )
}

/** V233-Kacheln: neue Leads, gesendet, angenommen, Abschlussquote, Nachfassen fällig. */
export function Kacheln({
  fakten,
  onDetail,
  onNachfassen,
}: {
  fakten: Fakt[]
  onDetail: (d: Detail) => void
  onNachfassen: () => void
}) {
  const { t } = useTranslation()
  const von = (s: string) => fakten.filter((f) => f.schluessel === s)
  const leads = von('leads_neu')
  const gesendet = von('gesendet')
  const angenommen = von('angenommen')
  const entschieden = [...angenommen, ...von('verloren')]
  const nachfassen = von('nf_faellig')
  const q = quote(entschieden)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="kz-kacheln">
      <Kachel
        titel={t('kz.kachel.leads')}
        zahl={String(leads.length)}
        onKlick={() => {
          onDetail({ titel: t('kz.kachel.leads'), fakten: leads })
        }}
      />
      <Kachel
        titel={t('kz.kachel.gesendet')}
        zahl={String(gesendet.length)}
        unter={franken(summe(gesendet))}
        onKlick={() => {
          onDetail({ titel: t('kz.kachel.gesendet'), fakten: gesendet })
        }}
      />
      <Kachel
        titel={t('kz.kachel.angenommen')}
        zahl={String(angenommen.length)}
        unter={franken(summe(angenommen))}
        onKlick={() => {
          onDetail({ titel: t('kz.kachel.angenommen'), fakten: angenommen })
        }}
      />
      <Kachel
        titel={t('kz.kachel.quote')}
        zahl={q === null ? '–' : `${String(q)} %`}
        unter={t('kz.kachel.quoteHinweis', { n: entschieden.length })}
        onKlick={() => {
          onDetail({ titel: t('kz.kachel.quote'), fakten: entschieden })
        }}
      />
      <Kachel
        titel={t('kz.kachel.nachfassen')}
        zahl={String(nachfassen.length)}
        unter={t('kz.kachel.nachfassenHinweis')}
        onKlick={onNachfassen}
      />
    </div>
  )
}
