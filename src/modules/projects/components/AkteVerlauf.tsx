import type { TFunction } from 'i18next'
import { ClipboardList, Mail, MapPin, MessageSquare, Phone, Send, StickyNote, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { vermerken } from '../services/leitstand'
import type { Akte } from '../types'
import { Box } from './AkteBox'

const ARTEN = ['notiz', 'anruf', 'mail', 'besuch'] as const
const ICON: Record<string, LucideIcon> = {
  notiz: StickyNote,
  anruf: Phone,
  mail: Mail,
  besuch: MapPin,
  sms: MessageSquare,
  rapport: ClipboardList,
}

/** Verlauf als Zeitachse: Einträge von Hand, Mails aus dem Posteingang und Rapporte der Baustelle. */
function eintraege(akte: Akte, t: TFunction): Zeitpunkt[] {
  const liste: Zeitpunkt[] = akte.verlauf.map((v) => ({
    id: `${v.quelle}:${v.id}`,
    zeitpunkt: v.zeit,
    icon: ICON[v.art] ?? StickyNote,
    titel:
      v.quelle === 'mail'
        ? t('projekte.verlauf.mailVon', { name: v.person ?? '–' })
        : `${t(`projekte.verlauf.art.${v.art}`, { defaultValue: v.art })}${v.person ? ` · ${v.person}` : ''}`,
    text:
      [v.betreff && v.quelle === 'mail' ? v.betreff : null, v.text, v.ergebnis].filter(Boolean).join('\n') || undefined,
    ton: v.quelle === 'mail' ? 'bg-info-soft text-info' : 'bg-muted text-muted-foreground',
  }))
  // Was für das Projekt im Ausgangskorb liegt (z. B. Kundeninfo bei Meilensteinen, wartet auf Freigabe) oder ging.
  for (const a of akte.ausgang)
    liste.push({
      id: `ausgang:${a.id}`,
      zeitpunkt: a.gesendet_am ?? a.erstellt_am,
      icon: a.kanal === 'sms' ? MessageSquare : Send,
      titel: t(`projekte.verlauf.ausgang.${a.status}`, { defaultValue: t('projekte.verlauf.ausgang.wartet') }),
      text: a.betreff ?? undefined,
      ton: a.status === 'gesendet' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn',
    })
  for (const r of akte.rapporte)
    liste.push({
      id: `rapport:${r.id}`,
      zeitpunkt: `${r.datum}T12:00:00Z`,
      icon: ClipboardList,
      titel: t('projekte.verlauf.rapport', { nummer: r.nummer ?? '', person: r.person ?? '' }),
      text: r.arbeiten ?? undefined,
      meta: r.stunden != null ? t('projekte.seite.stunden', { stunden: r.stunden }) : undefined,
      ton: 'bg-ok-soft text-ok',
    })
  return liste.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
}

/** Verlauf mit Eingabe oben: Notiz, Anruf, Mail oder Besuch festhalten; erscheint auch beim Kunden. */
export function Verlauf({ projektId, akte }: { projektId: string; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { laeuft, aus } = useAktion()
  const [art, setArt] = useState<(typeof ARTEN)[number]>('notiz')
  const [text, setText] = useState('')

  const speichern = async () => {
    const ok = await aus(() => vermerken(projektId, art, text), { de: 'Im Verlauf', fr: 'Dans l’historique' })
    if (ok) setText('')
  }

  return (
    <Box titel={t('projekte.seite.verlauf')}>
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
        <Filterchips
          beschriftung={t('projekte.verlauf.artWahl')}
          einzeln
          optionen={ARTEN.map((a) => ({ wert: a, text: t(`projekte.verlauf.art.${a}`) }))}
          gewaehlt={[art]}
          onChange={(v) => {
            setArt((v[0] ?? 'notiz') as (typeof ARTEN)[number])
          }}
        />
        <Textarea
          rows={2}
          aria-label={t('projekte.verlauf.eingabe')}
          placeholder={t('projekte.verlauf.eingabe')}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={!text.trim()} laedt={laeuft} onClick={() => void speichern()}>
            {t('projekte.verlauf.speichern')}
          </Button>
        </div>
      </div>
      {akte && akte.verlauf.length + akte.rapporte.length + akte.ausgang.length > 0 ? (
        <Zeitachse eintraege={eintraege(akte, t)} sprache={sprache} />
      ) : (
        <p className="text-muted-foreground">{t('projekte.verlauf.leer')}</p>
      )}
    </Box>
  )
}
