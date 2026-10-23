import { Mail, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatKundennummer } from '@/lib/kontakt'
import { mitMail, mitPost } from '../lib/zielgruppe'
import type { Gruppe, Zielkontakt } from '../types'
import { ZielAktionen } from './ZielAktionen'

/** Höchstens so viele Zeilen zeigen; die Auswahl gilt trotzdem für alle gefilterten. */
const ZEIGEN = 200

const TON: Record<Gruppe, 'ok' | 'info' | 'marke' | 'neutral' | 'warnung'> = {
  kunde: 'ok',
  offerte: 'marke',
  interessent: 'info',
  verloren: 'neutral',
  kein_interesse: 'neutral',
  ohne: 'neutral',
}

/**
 * Zielgruppe als Tabelle mit Häkchen (V233 «Kunden anschreiben»): Name, Ort, Kanton, Sprache, Gruppe und ob Mail
 * oder Postadresse da ist. Abgemeldete sind grau und lassen sich nicht wählen.
 */
export function ZielTabelle({
  liste,
  auswahl,
  onAuswahl,
}: {
  liste: Zielkontakt[]
  auswahl: ReadonlySet<string>
  onAuswahl: (ids: Set<string>) => void
}) {
  const { t } = useTranslation()
  const umschalten = (id: string, an: boolean) => {
    const neu = new Set(auswahl)
    if (an) neu.add(id)
    else neu.delete(id)
    onAuswahl(neu)
  }
  return (
    <div className="flex flex-col gap-2">
      <Tabelle aria-label={t('marketing.anschreiben.tabelle')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle className="w-8">
              <span className="sr-only">{t('marketing.anschreiben.waehlen')}</span>
            </Kopfzelle>
            <Kopfzelle>{t('marketing.spalte.name')}</Kopfzelle>
            <Kopfzelle className="hidden md:table-cell">{t('marketing.spalte.ort')}</Kopfzelle>
            <Kopfzelle className="hidden lg:table-cell">{t('marketing.spalte.kanton')}</Kopfzelle>
            <Kopfzelle className="hidden sm:table-cell">{t('marketing.spalte.sprache')}</Kopfzelle>
            <Kopfzelle>{t('marketing.spalte.gruppe')}</Kopfzelle>
            <Kopfzelle>{t('marketing.spalte.kontakt')}</Kopfzelle>
            <Kopfzelle className="w-10">
              <span className="sr-only">{t('marketing.aktionen.spalte')}</span>
            </Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {liste.slice(0, ZEIGEN).map((k) => (
            <Zeile key={k.id} className={k.werbesperre ? 'text-muted-foreground' : ''}>
              <Zelle>
                <Checkbox
                  aria-label={t('marketing.anschreiben.waehlenName', { name: k.name })}
                  checked={auswahl.has(k.id)}
                  disabled={k.werbesperre}
                  onCheckedChange={(an) => {
                    umschalten(k.id, an === true)
                  }}
                />
              </Zelle>
              <Zelle>
                <div className="flex flex-col">
                  <span className="font-medium">{k.name || t('marketing.ohneName')}</span>
                  <span className="text-muted-foreground text-xs">
                    {[formatKundennummer(k.kundennummer), k.firma && k.vorname ? k.firma : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              </Zelle>
              <Zelle className="hidden md:table-cell">{[k.plz, k.ort].filter(Boolean).join(' ')}</Zelle>
              <Zelle className="hidden lg:table-cell">{k.kanton}</Zelle>
              <Zelle className="hidden uppercase sm:table-cell">{k.sprache}</Zelle>
              <Zelle>
                {k.werbesperre ? (
                  <Badge ton="warnung">{t('marketing.abgemeldet')}</Badge>
                ) : (
                  <Badge ton={TON[k.gruppe]}>{t(`marketing.gruppe.${k.gruppe}`)}</Badge>
                )}
              </Zelle>
              <Zelle>
                <span className="text-muted-foreground flex gap-1.5">
                  <Mail
                    className={mitMail(k) ? 'text-ok size-4' : 'size-4 opacity-30'}
                    aria-label={mitMail(k) ? t('marketing.mitMail') : t('marketing.ohneMail')}
                  />
                  <MapPin
                    className={mitPost(k) ? 'text-ok size-4' : 'size-4 opacity-30'}
                    aria-label={mitPost(k) ? t('marketing.mitPost') : t('marketing.ohnePost')}
                  />
                </span>
              </Zelle>
              <Zelle>
                <ZielAktionen kontakt={k} />
              </Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
      {liste.length > ZEIGEN && (
        <p className="text-muted-foreground text-sm">
          {t('marketing.anschreiben.mehr', { anzahl: liste.length - ZEIGEN })}
        </p>
      )}
    </div>
  )
}
