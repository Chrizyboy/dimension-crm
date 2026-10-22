import { Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useSubauftraege, useSubunternehmer } from '../hooks/useProjekte'
import { ortZeile } from '../lib/anzeige'
import { subauftragAngefragt, subauftragEntfernen } from '../services/subunternehmer'
import type { Projekt, Subauftrag } from '../types'
import { SubauftragDialog } from './SubauftragDialog'

const TON = { angefragt: 'warnung', bestaetigt: 'info', erledigt: 'ok', abgesagt: 'neutral' } as const

/**
 * Aufträge an Subunternehmer zu dieser Baustelle (Gerüst, Elektro, Dachdecker …). Die Anfrage geht als
 * Mail in der Sprache des Subunternehmers über den Ausgangskorb; das Datum wird beim Senden gemerkt.
 */
export function AkteSubunternehmer({ projekt }: { projekt: Projekt }) {
  const { t, i18n } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const auftraege = useSubauftraege(projekt.id)
  const subs = useSubunternehmer()
  const { aus } = useAktion()
  const [dialog, setDialog] = useState<{ art: 'bearbeiten' | 'mail'; a: Subauftrag | null } | null>(null)

  const mailVorlage = (a: Subauftrag) => {
    const s = subs.data?.find((x) => x.id === a.subunternehmer_id)
    const tt = i18n.getFixedT(s?.sprache ?? 'de')
    const termin = a.termin_von
      ? `${formatDatum(a.termin_von)}${a.termin_bis && a.termin_bis !== a.termin_von ? ` – ${formatDatum(a.termin_bis)}` : ''}`
      : tt('projekte.sub.mail.terminOffen')
    return {
      an: s?.email ?? '',
      betreff: tt('projekte.sub.mail.betreff', { nummer: projekt.nummer, ort: projekt.ort ?? '' }),
      text: tt('projekte.sub.mail.text', {
        leistung: a.leistung,
        adresse: [projekt.strasse, ortZeile(projekt)].filter(Boolean).join(', '),
        termin,
        absender: ich?.name ?? '',
      }),
      sprache: s?.sprache ?? 'de',
      art: 'subunternehmer',
      projekt_id: projekt.id,
      bezug_tabelle: 'subunternehmer_auftraege',
      bezug_id: a.id,
    } as const
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {auftraege.isPending ? (
        <Skelett className="h-24" />
      ) : (auftraege.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('projekte.sub.keine')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(auftraege.data ?? []).map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{a.subunternehmer}</span>
                  <Badge ton={TON[a.status]}>{t(`projekte.subStatus.${a.status}`)}</Badge>
                </span>
                <span className="text-muted-foreground text-xs">
                  {[
                    a.leistung,
                    a.termin_von ? formatDatum(a.termin_von) : null,
                    a.betrag_rappen != null ? formatChf(a.betrag_rappen, { mitWaehrung: true }) : null,
                    a.angefragt_am ? t('projekte.sub.angefragtAm', { datum: formatDatum(a.angefragt_am) }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('projekte.sub.anfragen')}
                disabled={!subs.data?.find((x) => x.id === a.subunternehmer_id)?.email}
                onClick={() => {
                  setDialog({ art: 'mail', a })
                }}
              >
                <Mail />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('projekte.sub.aendern')}
                onClick={() => {
                  setDialog({ art: 'bearbeiten', a })
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('projekte.sub.entfernen')}
                onClick={() => {
                  void aus(() => subauftragEntfernen(a.id), {
                    de: 'In den Papierkorb gelegt',
                    fr: 'Mis à la corbeille',
                  })
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          setDialog({ art: 'bearbeiten', a: null })
        }}
      >
        <Plus />
        {t('projekte.sub.neu')}
      </Button>
      {dialog?.art === 'bearbeiten' && (
        <SubauftragDialog
          projektId={projekt.id}
          auftrag={dialog.a}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
      {dialog?.art === 'mail' && dialog.a && (
        <MailDialog
          titel={t('projekte.sub.anfragen')}
          vorlage={mailVorlage(dialog.a)}
          dateien={[]}
          onSchliessen={() => {
            setDialog(null)
          }}
          onGesendet={() => {
            const id = dialog.a?.id
            if (id) void aus(() => subauftragAngefragt(id))
          }}
        />
      )}
    </div>
  )
}
