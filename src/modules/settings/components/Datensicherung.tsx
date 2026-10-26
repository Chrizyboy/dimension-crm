import { CloudOff, Download, ExternalLink, History, RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { fehlerText, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useSicherungen, useSicherungenNeuLaden } from '../hooks/useSicherungen'
import { groesse, kurzInhalt, naechsterTermin } from '../lib/sicherung'
import { ladeSicherungHerunter, sichereJetzt } from '../services/sicherung'
import type { Sicherung } from '../types'
import { WiederherstellenDialog } from './WiederherstellenDialog'

const TON = { ok: 'ok', laeuft: 'info', fehler: 'kritisch', abgelaufen: 'neutral' } as const

/**
 * Einstellungen › Datensicherung (V233 «Backup»): automatisch um 12:00 und 16:00, «Jetzt sichern», Liste mit
 * Inhalt, Kopie in SharePoint, herunterladen und wiederherstellen. Nur Administration.
 */
export function Datensicherung() {
  const { t } = useTranslation()
  const { liste, stunden } = useSicherungen()
  const neuLaden = useSicherungenNeuLaden()
  const [laeuft, setLaeuft] = useState(false)
  const [laedt, setLaedt] = useState<string | null>(null)
  const [zurueck, setZurueck] = useState<Sicherung | null>(null)

  const daten = liste.data ?? []
  const letzte = daten.find((s) => s.status === 'ok' && s.art === 'automatisch')
  const termin = naechsterTermin(new Date(), stunden.data ?? [12, 16])
  const um = (h: number) => `${String(h).padStart(2, '0')}:00`

  const jetzt = async () => {
    setLaeuft(true)
    try {
      const r = await sichereJetzt()
      melde('ok', {
        de: `Gesichert: ${r.zeilen.toLocaleString('de-CH')} Einträge, ${groesse(r.bytes)}`,
        fr: `Sauvegardé : ${r.zeilen.toLocaleString('fr-CH')} entrées, ${groesse(r.bytes)}`,
      })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      void neuLaden()
    }
  }

  const holen = async (s: Sicherung) => {
    setLaedt(s.id)
    try {
      await ladeSicherungHerunter(s)
    } catch {
      melde('kritisch', { de: 'Herunterladen fehlgeschlagen', fr: 'Échec du téléchargement' })
    } finally {
      setLaedt(null)
    }
  }

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <KarteTitel>{t('sicherung.titel')}</KarteTitel>
          <p className="text-muted-foreground text-sm">
            {t('sicherung.plan', { stunden: (stunden.data ?? [12, 16]).map(um).join(` ${t('sicherung.und')} `) })}
            {' · '}
            {t(termin.morgen ? 'sicherung.naechsteMorgen' : 'sicherung.naechsteHeute', { zeit: um(termin.stunde) })}
            {letzte && ` · ${t('sicherung.letzte', { zeit: formatDatumZeit(letzte.begonnen_am) })}`}
          </p>
          <p className="text-muted-foreground text-sm">{t('sicherung.aufbewahren')}</p>
        </div>
        <Button onClick={() => void jetzt()} laedt={laeuft}>
          <ShieldCheck />
          {t('sicherung.jetzt')}
        </Button>
      </KarteKopf>
      <KarteInhalt className="p-0">
        {liste.error ? (
          <Fehlerzustand details={liste.error.message} onNochmal={() => void liste.refetch()} />
        ) : liste.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skelett key={i} className="h-12" />
            ))}
          </div>
        ) : daten.length === 0 ? (
          <Leerzustand icon={History} titel={t('sicherung.leerTitel')} text={t('sicherung.leerText')} />
        ) : (
          <ul className="divide-y">
            {daten.map((s) => {
              const k = kurzInhalt(s.anzahl)
              const brauchbar = s.status === 'ok' && Boolean(s.pfad)
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                  <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="zahlen">{formatDatumZeit(s.begonnen_am)}</span>
                      <Badge ton={TON[s.status as keyof typeof TON]} punkt>
                        {t(`sicherung.status.${s.status}`)}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">
                      {t(`sicherung.art.${s.art}`)}
                      {s.von_name && ` · ${s.von_name}`}
                      {s.fehler && ` · ${fehlerText(new Error(s.fehler))}`}
                    </span>
                    {s.wiederhergestellt_am && (
                      <span className="text-warn text-xs font-medium">
                        {t('sicherung.wiederhergestelltAm', {
                          zeit: formatDatumZeit(s.wiederhergestellt_am),
                          von: s.wiederhergestellt_von ?? '',
                        })}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground zahlen min-w-40">
                    {s.status === 'ok' || s.status === 'abgelaufen'
                      ? t('sicherung.inhalt', {
                          kontakte: k.kontakte,
                          offerten: k.offerten,
                          groesse: groesse(s.bytes),
                        })
                      : '–'}
                  </span>
                  <SharepointStand s={s} />
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!brauchbar}
                      laedt={laedt === s.id}
                      onClick={() => void holen(s)}
                    >
                      <Download />
                      {t('sicherung.herunterladen')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-bad"
                      disabled={!brauchbar}
                      onClick={() => {
                        setZurueck(s)
                      }}
                    >
                      <RotateCcw />
                      {t('sicherung.wiederherstellen')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </KarteInhalt>
      {zurueck && (
        <WiederherstellenDialog
          sicherung={zurueck}
          onSchliessen={() => {
            setZurueck(null)
            void neuLaden()
          }}
        />
      )}
    </Karte>
  )
}

/** Kopie in SharePoint: Link, Fehler oder (noch) keine. */
function SharepointStand({ s }: { s: Sicherung }) {
  const { t } = useTranslation()
  if (s.status !== 'ok') return <span className="min-w-28" />
  if (s.sharepoint?.ok && s.sharepoint.url) {
    return (
      <a
        href={s.sharepoint.url}
        target="_blank"
        rel="noreferrer"
        className="text-primary dark:text-accent inline-flex min-w-28 items-center gap-1 font-medium underline-offset-4 hover:underline"
      >
        {t('sicherung.sharepoint')}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    )
  }
  return (
    <span className="text-muted-foreground inline-flex min-w-28 items-center gap-1" title={s.sharepoint?.fehler ?? ''}>
      <CloudOff className="size-3.5" aria-hidden="true" />
      {s.sharepoint ? t('sicherung.sharepointFehler') : t('sicherung.sharepointNein')}
    </span>
  )
}
