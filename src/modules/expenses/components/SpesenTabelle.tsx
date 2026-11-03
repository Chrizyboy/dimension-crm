import { Ban, Paperclip, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { useKategorieText } from '../hooks/useKategorieText'
import { belegZeigen } from '../services/spesen'
import type { Spese } from '../types'
import { HinweisMarken, StandMarke } from './Marken'

/**
 * Spesen als Tabelle: Datum, (Person), Zweck mit Kategorie, Projekt und Hinweisen, Beleg, Betrag, Stand.
 * Wählbare Zeilen lassen sich ankreuzen (Mail, Auszahlen); ändern und zurückziehen nur, solange erlaubt.
 */
export function SpesenTabelle({
  liste,
  mitPerson,
  auswahl,
  onAuswahl,
  waehlbar,
  onAendern,
  onStorno,
}: {
  liste: Spese[]
  mitPerson: boolean
  auswahl: ReadonlySet<string>
  onAuswahl: (ids: Set<string>) => void
  waehlbar: (s: Spese) => boolean
  onAendern?: (s: Spese) => void
  onStorno?: (s: Spese) => void
}) {
  const { t } = useTranslation()
  const kategorie = useKategorieText()
  const moegliche = liste.filter(waehlbar)
  const alleAn = moegliche.length > 0 && moegliche.every((s) => auswahl.has(s.id))
  const erledigt = (s: Spese) => s.status === 'storniert' || s.status === 'abgelehnt'

  return (
    <Tabelle aria-label={t('spesen.titel')}>
      <TabelleKopf>
        <tr>
          <Kopfzelle className="w-8">
            <Checkbox
              aria-label={t('spesen.alleWaehlen')}
              checked={alleAn}
              disabled={moegliche.length === 0}
              onCheckedChange={(an) => {
                onAuswahl(new Set(an === true ? moegliche.map((s) => s.id) : []))
              }}
            />
          </Kopfzelle>
          <Kopfzelle className="hidden md:table-cell">{t('spesen.spalte.datum')}</Kopfzelle>
          {mitPerson && <Kopfzelle className="hidden md:table-cell">{t('spesen.spalte.person')}</Kopfzelle>}
          <Kopfzelle>{t('spesen.spalte.zweck')}</Kopfzelle>
          <Kopfzelle className="hidden lg:table-cell">{t('spesen.spalte.projekt')}</Kopfzelle>
          <Kopfzelle className="hidden md:table-cell">{t('spesen.spalte.beleg')}</Kopfzelle>
          <Kopfzelle className="text-right">{t('spesen.spalte.betrag')}</Kopfzelle>
          <Kopfzelle>{t('spesen.spalte.status')}</Kopfzelle>
          <Kopfzelle>
            <span className="sr-only">{t('tabelle.aktionen')}</span>
          </Kopfzelle>
        </tr>
      </TabelleKopf>
      <TabelleKoerper>
        {liste.map((s) => {
          const darfAendern = (s.status === 'eingereicht' || s.status === 'rueckfrage') && onAendern
          return (
            <Zeile key={s.id} className={erledigt(s) ? 'text-muted-foreground' : ''}>
              <Zelle>
                {waehlbar(s) && (
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
              {/* Am Handy stehen Datum und Person unter dem Zweck, damit Betrag und Stand sichtbar bleiben. */}
              <Zelle className="zahlen hidden whitespace-nowrap md:table-cell">{formatDatum(s.datum)}</Zelle>
              {mitPerson && <Zelle className="hidden whitespace-nowrap md:table-cell">{s.person ?? '–'}</Zelle>}
              <Zelle>
                <span className="flex max-w-[28rem] min-w-0 flex-col gap-0.5">
                  <span className={erledigt(s) ? 'line-clamp-2 line-through' : 'line-clamp-2 font-medium'}>
                    {s.zweck ?? '–'}
                  </span>
                  <span className="text-muted-foreground zahlen text-xs md:hidden">
                    {[formatDatum(s.datum), mitPerson ? s.person : null].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-muted-foreground line-clamp-2 text-xs">
                    {[
                      kategorie(s.kategorie),
                      s.art === 'kilometer' && s.km
                        ? t('spesen.kmZeile', { km: s.km, satz: formatChf(s.km_satz_rappen ?? 0) })
                        : null,
                      s.bezahlt_mit === 'firmenkarte' ? t('spesen.bezahlt.firmenkarte') : null,
                      s.mwst_satz ? t('spesen.mwstZeile', { satz: s.mwst_satz }) : null,
                      s.abgelehnt_grund ?? s.storniert_grund ?? s.rueckfrage ?? s.notiz,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {mitPerson && <HinweisMarken spese={s} />}
                </span>
              </Zelle>
              <Zelle className="text-muted-foreground hidden text-xs lg:table-cell">
                {s.projekt_nummer ? (
                  <span className="line-clamp-2">
                    {[s.projekt_nummer, s.projekt_titel].filter(Boolean).join(' · ')}
                  </span>
                ) : (
                  '–'
                )}
              </Zelle>
              <Zelle className="hidden md:table-cell">
                {s.beleg_id ? (
                  <Button variant="link" size="sm" onClick={() => void belegZeigen(s.beleg_id ?? '')}>
                    <Paperclip />
                    {t('spesen.belegAnsehen')}
                  </Button>
                ) : s.art === 'kilometer' ? (
                  <span className="text-muted-foreground text-xs">{t('spesen.art.kilometer')}</span>
                ) : (
                  <span className="text-warn text-xs">{t('spesen.ohneBeleg')}</span>
                )}
              </Zelle>
              <Zelle className="zahlen text-right whitespace-nowrap">{formatChf(s.betrag_rappen)}</Zelle>
              <Zelle>
                <StandMarke spese={s} />
              </Zelle>
              <Zelle className="text-right whitespace-nowrap">
                {darfAendern && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('spesen.aendern', { zweck: s.zweck ?? '' })}
                    onClick={() => {
                      onAendern(s)
                    }}
                  >
                    <Pencil />
                  </Button>
                )}
                {(s.status === 'eingereicht' || s.status === 'rueckfrage') && onStorno && (
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
          )
        })}
      </TabelleKoerper>
    </Tabelle>
  )
}
