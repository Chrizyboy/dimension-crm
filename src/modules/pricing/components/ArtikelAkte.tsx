import { ArchiveRestore, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { prozentText } from '../lib/prozent'
import { archiviere } from '../services/preise'
import type { Artikel } from '../types'
import { ArtikelDatenblaetter } from './ArtikelDatenblaetter'
import { ArtikelLieferanten } from './ArtikelLieferanten'
import { ArtikelMasse } from './ArtikelMasse'

function Verweis({ a, onOeffnen }: { a: Artikel; onOeffnen: (id: string) => void }) {
  return (
    <button
      type="button"
      className="text-primary dark:text-accent inline-flex items-center gap-1 text-left text-sm hover:underline"
      onClick={() => {
        onOeffnen(a.id)
      }}
    >
      <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      {[a.gruppe, a.name].filter(Boolean).join(' · ')}
    </button>
  )
}

/**
 * Artikel im Seitenpanel (V61, V87, V97, V121): Preise, Datenblätter DE/FR/EN, Nachfolger und Vorgänger,
 * Lieferantenpreise (der günstigste ist der EK) sowie Masse und Gewicht.
 */
export default function ArtikelAkte({
  artikel: a,
  alle,
  onOeffnen,
  onSchliessen,
}: {
  artikel: Artikel | null
  alle: Artikel[]
  onOeffnen: (id: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const satz = useMwst()
  const kategorien = useAuswahl('artikelkategorie')
  const zurueck = usePreisAenderung((id: string) => archiviere(id, null))
  const nachfolger = a?.nachfolgerId ? alle.find((x) => x.id === a.nachfolgerId) : undefined
  const vorgaenger = a ? alle.filter((x) => x.nachfolgerId === a.id) : []

  async function wiederherstellen(x: Artikel) {
    try {
      await zurueck.mutateAsync(x.id)
      melde('ok', zweisprachig('preise.archiv.zurueck', { name: x.name }))
    } catch (f) {
      meldeFehler(f, 'preise.archiv')
      melde('kritisch', zweisprachig('fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={a?.name ?? t('preise.titel')}
        {...(a
          ? { beschreibung: [a.gruppe, a.artikelnummer, kategorien.text(a.kategorie)].filter(Boolean).join(' · ') }
          : {})}
        className="md:w-[36rem]"
      >
        {!a ? (
          <p className="text-muted-foreground text-sm">{t('preise.akte.nichtMehr')}</p>
        ) : (
          <div className="flex flex-col">
            {a.archiviertAm && (
              <div className="bg-warn-soft text-warn mb-3 flex flex-wrap items-center gap-2 rounded-md p-2 text-sm">
                <span className="flex-1">
                  {t('preise.akte.archiviert', {
                    datum: formatDatum(a.archiviertAm),
                    von: a.archiviertVon ?? '–',
                    grund: a.archivGrund ?? '–',
                  })}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  laedt={zurueck.isPending}
                  onClick={() => void wiederherstellen(a)}
                >
                  <ArchiveRestore />
                  {t('preise.archiv.wiederherstellen')}
                </Button>
              </div>
            )}
            <AkteAbschnitt titel={t('preise.akte.preise')}>
              <dl>
                <Angabe label={t('preise.spalte.vk')}>
                  {a.vkRappen
                    ? `${formatChf(a.vkRappen, { mitWaehrung: true })} · ${t('preise.inkl', { betrag: formatChf(mitMwst(a.vkRappen, satz)) })}`
                    : '–'}
                </Angabe>
                <Angabe label={t('preise.spalte.ek')}>
                  {a.ekRappen !== null ? formatChf(a.ekRappen, { mitWaehrung: true }) : '–'}
                  {a.ekStand && <span className="text-muted-foreground"> · {formatDatum(a.ekStand)}</span>}
                </Angabe>
                <Angabe label={t('preise.akte.margeSkonto')}>
                  {`${prozentText(a.marge) || '–'} % · ${prozentText(a.skonto) || '–'} %`}
                  {a.rabatt ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {t('preise.akte.rabatt', { prozent: prozentText(a.rabatt) })}
                    </span>
                  ) : null}
                </Angabe>
                {a.leistungW ? <Angabe label={t('preise.spalte.wp')}>{a.leistungW} Wp</Angabe> : null}
              </dl>
            </AkteAbschnitt>
            <ArtikelDatenblaetter a={a} />
            {(nachfolger !== undefined || vorgaenger.length > 0) && (
              <AkteAbschnitt titel={t('preise.akte.nachfolge')}>
                <div className="flex flex-col gap-1">
                  {nachfolger && (
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge ton="info">{t('preise.akte.nachfolger')}</Badge>
                      <Verweis a={nachfolger} onOeffnen={onOeffnen} />
                    </p>
                  )}
                  {vorgaenger.map((v) => (
                    <p key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge ton="neutral">{t('preise.akte.vorgaenger')}</Badge>
                      <Verweis a={v} onOeffnen={onOeffnen} />
                    </p>
                  ))}
                </div>
              </AkteAbschnitt>
            )}
            <ArtikelLieferanten a={a} />
            <ArtikelMasse a={a} />
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
