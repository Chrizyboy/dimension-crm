import { ArrowRightLeft, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatum } from '@/lib/format'
import { useFahrzeuge, useGeraete, useNamen } from '../hooks/useRessourcen'
import { serviceKmStand } from '../lib/fristen'
import { FristBadge } from './FristBadge'
import { Verlauf } from './Verlauf'

export type AkteAktion = 'bearbeiten' | 'eintrag' | 'uebergeben'

/**
 * Akte eines Fahrzeugs als Seitenpanel: Fristen (MFK, Service nach Datum und Kilometern), Angaben, Geräte an
 * Bord und Verlauf. Unten «Eintrag erfassen» (MFK, Service, Kilometer, Schaden) und «Übergeben».
 */
export function FahrzeugAkte({
  id,
  onAktion,
  onSchliessen,
}: {
  id: string
  onAktion: (a: AkteAktion) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const namen = useNamen()
  const f = useFahrzeuge().data?.find((x) => x.id === id)
  const anBord = (useGeraete().data ?? []).filter((g) => g.fahrzeug_id === id)
  const km = f ? serviceKmStand(f.km_stand, f.service_km) : 'ok'

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={f ? `${f.bezeichnung} · ${f.kennzeichen}` : t('fuhrpark.akte.fahrzeug')}
        {...(f
          ? {
              beschreibung: [f.marke_modell, f.jahrgang, namen.standort(f.standort_id)]
                .filter((x) => x && x !== '–')
                .join(' · '),
              fuss: (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onAktion('uebergeben')
                    }}
                  >
                    <ArrowRightLeft />
                    {t('fuhrpark.uebergeben.knopf')}
                  </Button>
                  <Button
                    onClick={() => {
                      onAktion('eintrag')
                    }}
                  >
                    <Plus />
                    {t('fuhrpark.eintrag.knopf')}
                  </Button>
                </>
              ),
            }
          : {})}
      >
        {!f ? (
          <p className="text-muted-foreground py-6 text-sm">{t('fuhrpark.akte.weg')}</p>
        ) : (
          <div className="flex flex-col">
            <AkteAbschnitt titel={t('fuhrpark.akte.fristen')}>
              <dl>
                <Angabe label={t('fuhrpark.spalte.mfk')}>
                  <FristBadge datum={f.naechste_mfk} />
                </Angabe>
                <Angabe label={t('fuhrpark.spalte.service')}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <FristBadge datum={f.naechster_service} />
                    {f.service_km !== null && (
                      <Badge ton={km === 'ok' ? 'neutral' : km === 'bald' ? 'warnung' : 'kritisch'} className="zahlen">
                        {t('fuhrpark.akte.beiKm', { km: f.service_km.toLocaleString('de-CH') })}
                      </Badge>
                    )}
                  </span>
                </Angabe>
                <Angabe label={t('fuhrpark.spalte.km')}>
                  {f.km_stand !== null
                    ? `${f.km_stand.toLocaleString('de-CH')} km${f.km_stand_am ? ` (${formatDatum(f.km_stand_am)})` : ''}`
                    : '–'}
                </Angabe>
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('fuhrpark.akte.angaben')}>
              <dl>
                <Angabe label={t('fuhrpark.spalte.faehrt')}>{namen.person(f.person_id)}</Angabe>
                <Angabe label={t('fuhrpark.feld.leasingBis')}>
                  {f.leasing_bis ? formatDatum(f.leasing_bis) : '–'}
                </Angabe>
                <Angabe label={t('fuhrpark.feld.versicherung')}>{f.versicherung ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.notiz')}>{f.notiz ?? '–'}</Angabe>
                {f.ausser_betrieb && (
                  <Angabe label={t('fuhrpark.feld.status')}>
                    <Badge>{t('fuhrpark.ausserBetrieb')}</Badge>
                  </Angabe>
                )}
              </dl>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => {
                  onAktion('bearbeiten')
                }}
              >
                <Pencil />
                {t('fuhrpark.akte.bearbeiten')}
              </Button>
            </AkteAbschnitt>
            {anBord.length > 0 && (
              <AkteAbschnitt titel={t('fuhrpark.akte.anBord')} zusatz={anBord.length}>
                <ul className="flex flex-col gap-1 text-sm">
                  {anBord.map((g) => (
                    <li key={g.id}>
                      <a href={`#/fleet?ansicht=geraete&geraet=${g.id}`} className="text-accent-ink underline">
                        {g.bezeichnung}
                      </a>
                      {g.inventar_nr && (
                        <span className="text-muted-foreground zahlen ml-1 text-xs">{g.inventar_nr}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </AkteAbschnitt>
            )}
            <AkteAbschnitt titel={t('fuhrpark.akte.verlauf')}>
              <Verlauf bezug={{ fahrzeug: f.id }} />
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
