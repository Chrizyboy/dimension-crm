import { CheckCheck, Send, Sparkles, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTaste } from '@/hooks/useTaste'
import { useAnmeldung } from '@/stores/anmeldung'
import { feldFehler } from '@/lib/formular'
import { ausgangJetztSenden } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useAusgangAkte } from '../hooks/useAusgang'
import { useAusgangAktionen } from '../hooks/useAusgangAktionen'
import { alsText, STATUS_TON, zeitpunkt } from '../lib/anzeige'
import { aenderungSchema, type AusgangAenderung } from '../schema'
import { absenderIch, aendern, alsGesendet, ruecklauf, verwerfen, zurueckAn, zurueckholen } from '../services/ausgang'
import type { AusgangEintrag } from '../types'
import { DetailFuss } from './DetailFuss'
import { FehlerLoesung } from './FehlerLoesung'
import { MailInhalt } from './MailInhalt'
import { PruefKasten } from './PruefKasten'

/**
 * Akte eines Eintrags in der Werkbank: Kopf mit Stand und Herkunft, Inhalt so wie ihn der Kunde bekommt, daneben
 * Prüfungen und Zusammenhang, unten die Aktionen. Senden heisst immer: ein Mensch hat den Text gesehen (Regel 6).
 */
export function AusgangDetail({
  eintrag: e,
  onSchliessen,
  imPanel = false,
}: {
  eintrag: AusgangEintrag
  onSchliessen: () => void
  /** Im Seitenpanel (schmaler Bildschirm) schliesst das Panel selbst. */
  imPanel?: boolean
}) {
  const { t } = useTranslation()
  const ichName = useAnmeldung((z) => z.ich?.name ?? null)
  const akte = useAusgangAkte(e.id)
  const { laeuft, ausfuehren, freigebenUndSenden } = useAusgangAktionen()
  const offen = e.status === 'wartet' || e.status === 'fehler'
  const original: AusgangAenderung = {
    kanal: e.kanal,
    an: e.an,
    cc: e.cc ?? '',
    betreff: e.betreff ?? '',
    text: e.text ?? (e.html ? alsText(e.html) : ''),
  }
  const [w, setW] = useState<AusgangAenderung>(original)
  const [bearbeiten, setBearbeiten] = useState(false)
  const [fehler, setFehler] = useState<Partial<Record<keyof AusgangAenderung, string>>>({})
  const geaendert = (['an', 'cc', 'betreff', 'text'] as const).some((k) => w[k] !== original[k])

  /** Prüfen, Änderungen speichern, dann freigeben (mit «Rückgängig») oder für später planen. */
  function senden(sendeAb: Date | null) {
    const g = aenderungSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      setBearbeiten(true)
      return
    }
    setFehler({})
    void (async () => {
      if (geaendert && !(await ausfuehren(() => aendern(e.id, g.data)))) return
      if (await freigebenUndSenden([e.id], sendeAb)) onSchliessen()
    })()
  }

  useTaste(
    'f',
    () => {
      senden(null)
    },
    e.status === 'wartet' && e.darf_freigeben && !laeuft,
    t('ausgang.kuerzel.freigeben'),
  )
  useTaste(
    'e',
    () => {
      setBearbeiten(true)
    },
    offen && !bearbeiten,
    t('ausgang.kuerzel.bearbeiten'),
  )

  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-label={e.betreff ?? e.an}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge ton={STATUS_TON[e.status]} punkt>
              {t(`ausgang.status.${e.status}`)}
            </Badge>
            <Badge>{t(`ausgang.art.${e.art}`, { defaultValue: e.art })}</Badge>
            {e.automatisch && <Badge ton="info">{t('ausgang.automatisch')}</Badge>}
            {e.ki_status && e.ki_status !== 'uebersprungen' && (
              <Badge ton={e.ki_status === 'fertig' ? 'marke' : e.ki_status === 'fehler' ? 'warnung' : 'info'}>
                <Sparkles />
                {t(`ki.ausgang.${e.ki_status}`)}
              </Badge>
            )}
          </div>
          <h2 className="font-display text-base font-semibold break-words">{e.betreff ?? e.kunde ?? e.an}</h2>
          <p className="text-muted-foreground text-xs">
            {t('ausgang.herkunft', { name: e.vorbereitet_von ?? t('ausgang.system'), zeit: zeitpunkt(e.erstellt_am) })}
            {e.freigegeben_am &&
              ` · ${t('ausgang.freigegebenVon', { name: e.freigegeben_durch ?? t('ausgang.automatisch'), zeit: zeitpunkt(e.freigegeben_am) })}`}
            {e.gesendet_am && ` · ${t('ausgang.gesendetUm', { zeit: zeitpunkt(e.gesendet_am) })}`}
            {e.sende_ab && e.status !== 'gesendet' && ` · ${t('ausgang.geplantFuer', { zeit: zeitpunkt(e.sende_ab) })}`}
          </p>
        </div>
        {!imPanel && (
          <Button variant="ghost" size="icon" aria-label={t('allgemein.schliessen')} onClick={onSchliessen}>
            <X />
          </Button>
        )}
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4 2xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {e.zurueck_am && e.status === 'wartet' && (
            <p className="bg-info-soft rounded-lg p-3 text-sm">
              <span className="font-semibold">{t('ausgang.zurueckVon', { name: e.zurueck_von ?? '' })}:</span>{' '}
              {e.zurueck_notiz}
            </p>
          )}
          {e.status === 'fehler' && (
            <FehlerLoesung
              e={e}
              laeuft={laeuft}
              onNochmal={() => {
                senden(null)
              }}
              onAlsGesendet={() =>
                void ausfuehren(async () => {
                  await alsGesendet(e.id)
                  melde('ok', { de: 'Als gesendet vermerkt', fr: 'Marqué comme envoyé' })
                })
              }
              onAbsenderIch={() =>
                void ausfuehren(async () => {
                  await absenderIch(e.id)
                  melde('ok', { de: 'Geht jetzt aus deinem Outlook', fr: 'Part maintenant de ton Outlook' })
                })
              }
            />
          )}
          {e.status === 'verworfen' && (
            <p className="bg-muted rounded-lg p-3 text-sm">
              {t('ausgang.verworfenVon', { name: e.verworfen_von ?? '–' })}: {e.verworfen_grund ?? '–'}
            </p>
          )}
          {offen && !e.darf_freigeben && (
            <p className="bg-warn-soft rounded-lg p-3 text-sm">{t('ausgang.keinRecht')}</p>
          )}
          <MailInhalt e={e} w={w} bearbeiten={offen && bearbeiten} fehler={fehler} onAenderung={setW} />
        </div>
        <PruefKasten e={e} pruefungen={akte.pruefungen} kontext={akte.kontext} laedt={akte.laedt} />
      </div>

      <footer className="bg-surface-2 border-t px-4 py-3">
        {offen ? (
          <DetailFuss
            darf={e.darf_freigeben}
            mitFreigabe={e.status === 'wartet'}
            laeuft={laeuft}
            bearbeiten={bearbeiten}
            // «Zurück an» nur, wenn jemand anderes vorbereitet hat; an sich selbst zurückschicken hilft nicht.
            vorbereitetVon={e.vorbereitet_von === ichName ? null : e.vorbereitet_von}
            onBearbeiten={() => {
              setBearbeiten(true)
            }}
            onFreigeben={senden}
            onVerwerfen={(grund) =>
              void ausfuehren(async () => {
                await verwerfen(e.id, grund)
                melde('ok', { de: 'Wird nicht gesendet', fr: 'Ne sera pas envoyé' })
                onSchliessen()
              })
            }
            onZurueck={(notiz) =>
              void ausfuehren(async () => {
                await zurueckAn(e.id, notiz)
                melde('ok', { de: `Zurück an ${e.vorbereitet_von ?? ''}`, fr: `Renvoyé à ${e.vorbereitet_von ?? ''}` })
                onSchliessen()
              })
            }
          />
        ) : e.status === 'freigegeben' && e.kanal === 'brief' ? (
          <div className="flex justify-end">
            <Button
              laedt={laeuft}
              onClick={() =>
                void ausfuehren(async () => {
                  await alsGesendet(e.id)
                })
              }
            >
              <CheckCheck />
              {t('ausgang.brief.versendet')}
            </Button>
          </div>
        ) : e.status === 'freigegeben' ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              laedt={laeuft}
              onClick={() =>
                void ausfuehren(async () => {
                  await zurueckholen([e.id])
                })
              }
            >
              <Undo2 />
              {t('ausgang.zurueckholen')}
            </Button>
            <Button
              laedt={laeuft}
              onClick={() =>
                void ausfuehren(async () => {
                  await ausgangJetztSenden()
                })
              }
            >
              <Send />
              {t('ausgang.jetztSenden')}
            </Button>
          </div>
        ) : e.kanal === 'brief' && e.status === 'gesendet' ? (
          <div className="flex justify-end">
            <Button
              variant={e.ruecklauf_am ? 'secondary' : 'primary'}
              laedt={laeuft}
              onClick={() =>
                void ausfuehren(async () => {
                  await ruecklauf(e.id, !e.ruecklauf_am)
                })
              }
            >
              <CheckCheck />
              {t(e.ruecklauf_am ? 'ausgang.brief.ruecklaufNein' : 'ausgang.brief.ruecklaufJa')}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {e.antwort_am
              ? t('ausgang.antwortAm', { zeit: zeitpunkt(e.antwort_am) })
              : e.status === 'gesendet'
                ? t('ausgang.nochKeineAntwort')
                : ''}
          </p>
        )}
      </footer>
    </article>
  )
}
