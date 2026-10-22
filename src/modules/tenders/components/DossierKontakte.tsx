import { Mail, Pencil, Phone, Plus, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { antwort, entwerfen } from '../services/ausschreibungen'
import type { Anschreiben, Dossier, DossierKontakt } from '../types'
import { KontaktDialog } from './KontaktDialog'

const KANAL_ICON = { mail: Mail, brief: Printer, anruf: Phone }
const ANSCHREIBEN_TON = { entwurf: 'warnung', bewilligt: 'info', versendet: 'marke', abgelehnt: 'neutral' } as const

/** Nur Links ins Web öffnen (die Quelle ist eine Angabe von aussen, Regel 7). */
const istWebLink = (s: string) => /^https?:\/\//i.test(s)

/** Kontakte und Anschreiben eines Dossiers: erfassen, Entwurf anlegen, Antwort festhalten. */
export function DossierKontakte({
  dossier,
  kontakte,
  anschreiben,
}: {
  dossier: Dossier
  kontakte: DossierKontakt[]
  anschreiben: Anschreiben[]
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [dialog, setDialog] = useState<DossierKontakt | 'neu' | null>(null)
  const akquise = dossier.spur === 'akquise'

  return (
    <>
      <AkteAbschnitt titel={t('ausschreibungen.akte.kontakte')} zusatz={kontakte.length || undefined}>
        {kontakte.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('ausschreibungen.akte.keineKontakte')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kontakte.map((k) => {
              const hatEntwurf = anschreiben.some((a) => a.dossier_kontakt_id === k.id && a.status !== 'abgelehnt')
              return (
                <li key={k.id} className="flex flex-col gap-1 rounded-md border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{k.firma ?? k.name}</span>
                    <Badge>{t(`ausschreibungen.rolle.${k.rolle}`)}</Badge>
                    <Badge ton={k.art === 'privat' ? 'warnung' : 'neutral'}>
                      {t(`ausschreibungen.kontaktart.${k.art}`)}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {[
                      k.firma ? k.name : null,
                      k.email,
                      k.telefon,
                      [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '),
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('ausschreibungen.akte.ohneAdresse')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground truncate text-xs">
                      {t('ausschreibungen.kontakt.quelle_link')}:{' '}
                      {istWebLink(k.quelle_link) ? (
                        <a
                          className="text-accent-ink underline"
                          href={k.quelle_link}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {new URL(k.quelle_link).hostname}
                        </a>
                      ) : (
                        k.quelle_link
                      )}
                    </span>
                    {k.kontakt_id && <Badge ton="info">{t('ausschreibungen.akte.imCrm')}</Badge>}
                    <span className="ml-auto flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t('ausschreibungen.kontakt.aendern')}
                        onClick={() => {
                          setDialog(k)
                        }}
                      >
                        <Pencil />
                      </Button>
                      {akquise && !hatEntwurf && k.rolle !== 'vergabestelle' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          laedt={laeuft}
                          onClick={() => void aus(() => entwerfen(k.id))}
                        >
                          {t('ausschreibungen.akte.entwerfen')}
                        </Button>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setDialog('neu')
          }}
        >
          <Plus />
          {t('ausschreibungen.kontakt.neu')}
        </Button>
      </AkteAbschnitt>

      {anschreiben.length > 0 && (
        <AkteAbschnitt titel={t('ausschreibungen.akte.anschreiben')}>
          <ul className="flex flex-col gap-2">
            {anschreiben.map((a) => {
              const Icon = KANAL_ICON[a.kanal]
              return (
                <li key={a.id} className="flex flex-col gap-1.5 rounded-md border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="text-muted-foreground size-4 shrink-0"
                      aria-label={t(`ausschreibungen.kanal.${a.kanal}`)}
                    />
                    <span className="min-w-0 flex-1 truncate">{a.betreff}</span>
                    <Badge ton={ANSCHREIBEN_TON[a.status]} punkt>
                      {t(`ausschreibungen.anschreibenStatus.${a.status}`)}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {a.empfaenger}
                    {a.art === 'nachfassen' ? ` · ${t('ausschreibungen.nachfassen')}` : ''}
                    {a.versendet_am ? ` · ${formatDatumZeit(a.versendet_am)}` : ''}
                    {a.antwort_art
                      ? ` · ${t(`ausschreibungen.antwort.${a.antwort_art}`)}`
                      : a.antwort_am
                        ? ` · ${t('ausschreibungen.antwortDa')}`
                        : ''}
                    {a.abgelehnt_grund ? ` · ${a.abgelehnt_grund}` : ''}
                  </span>
                  {a.status === 'versendet' && !a.antwort_art && (
                    <div className="flex flex-wrap gap-1">
                      {(['interesse', 'kein_interesse', 'keine_werbung'] as const).map((art) => (
                        <Button
                          key={art}
                          size="sm"
                          variant={art === 'interesse' ? 'secondary' : 'ghost'}
                          laedt={laeuft}
                          onClick={() =>
                            void aus(() => antwort(a.id, art), {
                              de: 'Antwort festgehalten',
                              fr: 'Réponse enregistrée',
                            })
                          }
                        >
                          {t(`ausschreibungen.antwort.${art}`)}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </AkteAbschnitt>
      )}

      {dialog && (
        <KontaktDialog
          dossierId={dossier.id}
          sprache={dossier.sprache}
          kontakt={dialog === 'neu' ? null : dialog}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </>
  )
}
