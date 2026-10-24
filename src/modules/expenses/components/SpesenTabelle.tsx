import { Ban, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useKategorieText } from '../hooks/useKategorieText'
import { belegAdresse } from '../services/spesen'
import type { Spese, SpesenStatus } from '../types'

const TON: Record<SpesenStatus, 'warnung' | 'ok' | 'neutral'> = {
  eingereicht: 'warnung',
  ausbezahlt: 'ok',
  storniert: 'neutral',
}

/**
 * Spesen als Tabelle: Datum, (Person), Kategorie und Zweck, Beleg, Betrag, Stand. Offene lassen sich ankreuzen
 * (für «An die Buchhaltung» oder «Ausbezahlt») und stornieren.
 */
export function SpesenTabelle({
  liste,
  mitPerson,
  auswahl,
  onAuswahl,
  onStorno,
}: {
  liste: Spese[]
  mitPerson: boolean
  auswahl: ReadonlySet<string>
  onAuswahl: (ids: Set<string>) => void
  onStorno: (s: Spese) => void
}) {
  const { t } = useTranslation()
  const kategorie = useKategorieText()
  const offene = liste.filter((s) => s.status === 'eingereicht')
  const alleAn = offene.length > 0 && offene.every((s) => auswahl.has(s.id))

  async function belegZeigen(id: string) {
    // Fenster sofort öffnen (sonst blockiert der Browser es), dann die kurz gültige Adresse setzen.
    const fenster = window.open('', '_blank')
    try {
      const adresse = await belegAdresse(id)
      if (adresse && fenster) fenster.location.href = adresse
      else fenster?.close()
    } catch (f) {
      fenster?.close()
      meldeFehler(f, 'spesen')
    }
  }

  return (
    <Tabelle aria-label={t('spesen.titel')}>
      <TabelleKopf>
        <tr>
          <Kopfzelle className="w-8">
            <Checkbox
              aria-label={t('spesen.alleWaehlen')}
              checked={alleAn}
              disabled={offene.length === 0}
              onCheckedChange={(an) => {
                onAuswahl(new Set(an === true ? offene.map((s) => s.id) : []))
              }}
            />
          </Kopfzelle>
          <Kopfzelle>{t('spesen.spalte.datum')}</Kopfzelle>
          {mitPerson && <Kopfzelle>{t('spesen.spalte.person')}</Kopfzelle>}
          <Kopfzelle>{t('spesen.spalte.zweck')}</Kopfzelle>
          <Kopfzelle className="hidden md:table-cell">{t('spesen.spalte.beleg')}</Kopfzelle>
          <Kopfzelle className="text-right">{t('spesen.spalte.betrag')}</Kopfzelle>
          <Kopfzelle>{t('spesen.spalte.status')}</Kopfzelle>
          <Kopfzelle>
                <span className="sr-only">{t('tabelle.aktionen')}</span>
              </Kopfzelle>
        </tr>
      </TabelleKopf>
      <TabelleKoerper>
        {liste.map((s) => (
          <Zeile key={s.id} className={s.status === 'storniert' ? 'text-muted-foreground' : ''}>
            <Zelle>
              {s.status === 'eingereicht' && (
                <Checkbox
                  aria-label={t('spesen.waehlen', { zweck: s.zweck ?? '' })}
                  checked={auswahl.has(s.id)}
                  onCheckedChange={(an) => {
                    const neu = new Set(auswahl)
                    if (an === true) neu.add(s.id)
                    else neu.delete(s.id)
                    onAuswahl(neu)
                  }}
                />
              )}
            </Zelle>
            <Zelle className="zahlen whitespace-nowrap">{formatDatum(s.datum)}</Zelle>
            {mitPerson && <Zelle className="whitespace-nowrap">{s.person ?? '–'}</Zelle>}
            <Zelle>
              <span className="flex max-w-[26rem] min-w-0 flex-col">
                <span className={s.status === 'storniert' ? 'truncate line-through' : 'truncate font-medium'}>
                  {s.zweck ?? '–'}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {[kategorie(s.kategorie), s.storniert_grund ?? s.notiz].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Zelle>
            <Zelle className="hidden md:table-cell">
              {s.beleg_id ? (
                <Button variant="link" size="sm" onClick={() => void belegZeigen(s.beleg_id ?? '')}>
                  <Paperclip />
                  {t('spesen.belegAnsehen')}
                </Button>
              ) : (
                <span className="text-warn text-xs">{t('spesen.ohneBeleg')}</span>
              )}
            </Zelle>
            <Zelle className="zahlen text-right whitespace-nowrap">{formatChf(s.betrag_rappen)}</Zelle>
            <Zelle>
              <Badge ton={TON[s.status]} punkt>
                {s.status === 'ausbezahlt' && s.ausbezahlt_am
                  ? t('spesen.ausbezahltAm', { datum: formatDatum(s.ausbezahlt_am) })
                  : t(`spesen.status.${s.status}`)}
              </Badge>
            </Zelle>
            <Zelle className="text-right">
              {s.status === 'eingereicht' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('spesen.stornieren')}
                  onClick={() => {
                    onStorno(s)
                  }}
                >
                  <Ban />
                </Button>
              )}
            </Zelle>
          </Zeile>
        ))}
      </TabelleKoerper>
    </Tabelle>
  )
}
