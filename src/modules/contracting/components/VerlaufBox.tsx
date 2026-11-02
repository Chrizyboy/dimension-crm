import { CalendarClock, ChevronsRight, FileStack, History, Mail, Phone, Send, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Zeitachse } from '@/components/shared/Zeitachse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useNeuLaden, useVerlauf } from '../hooks/useGrossprojekte'
import { vermerken } from '../services/grossprojekte'
import { VERMERK_ARTEN } from '../types'
import { Box } from './Box'

const SYMBOL = {
  notiz: StickyNote,
  anruf: Phone,
  mail: Mail,
  termin: CalendarClock,
  stufe: ChevronsRight,
  schritt: CalendarClock,
  youdera: FileStack,
} as const
const TON: Record<string, string> = {
  anruf: 'bg-info-soft text-info',
  termin: 'bg-info-soft text-info',
  stufe: 'bg-ok-soft text-ok',
  youdera: 'bg-accent-soft text-accent-ink',
}

/**
 * Verlauf der Projekt-Akte: oben festhalten, was passiert ist (Notiz, Anruf, Mail, Termin), darunter alles in einer
 * Zeitachse, auch was das CRM selbst eingetragen hat (gefunden, Recherche, Entscheid, Stufen, Youdera).
 */
export function VerlaufBox({ id }: { id: string }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const daten = useVerlauf(id)
  const neuLaden = useNeuLaden()
  const { laeuft, aus } = useAktion()
  const [art, setArt] = useState<string>('notiz')
  const [text, setText] = useState('')
  const festhalten = () => {
    if (!text.trim()) return
    void aus(() => vermerken(id, art, text)).then((ok) => {
      if (ok) {
        setText('')
        void neuLaden()
      }
    })
  }
  const eintraege = (daten.data ?? []).map((v) => {
    const a = v.art && v.art in SYMBOL ? (v.art as keyof typeof SYMBOL) : null
    const vonHand = a !== null && (VERMERK_ARTEN as readonly string[]).includes(a)
    // Stufen schreibt die Datenbank als «Stufe: daten: Grund»; hier in der Sprache der Person.
    const stufe = a === 'stufe' ? /^Stufe: (\w+)(?:: (.*))?$/s.exec(v.text ?? '') : null
    if (stufe)
      return {
        id: v.id,
        zeitpunkt: v.zeitpunkt,
        icon: SYMBOL.stufe,
        titel: t('grossprojekte.verlauf.stufe', { stufe: t(`grossprojekte.stufe.${stufe[1] ?? ''}`) }),
        text: stufe[2],
        meta: v.person ?? undefined,
        ton: TON.stufe,
      }
    return {
      id: v.id,
      zeitpunkt: v.zeitpunkt,
      icon: a ? SYMBOL[a] : History,
      titel: vonHand ? t(`grossprojekte.verlauf.${a}`) : (v.text ?? '–'),
      text: vonHand ? (v.text ?? undefined) : undefined,
      meta: v.person ?? undefined,
      ton: a ? TON[a] : undefined,
    }
  })
  return (
    <Box titel={t('grossprojekte.akte.verlauf')} rechts={String(eintraege.length)}>
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
        <Filterchips
          einzeln
          beschriftung={t('grossprojekte.verlauf.art')}
          optionen={VERMERK_ARTEN.map((a) => ({ wert: a, text: t(`grossprojekte.verlauf.${a}`) }))}
          gewaehlt={[art]}
          onChange={([a]) => {
            if (a) setArt(a)
          }}
        />
        <Textarea
          aria-label={t('grossprojekte.verlauf.text')}
          placeholder={t('grossprojekte.verlauf.platzhalter')}
          rows={2}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) festhalten()
          }}
        />
        <Button size="sm" className="self-end" disabled={!text.trim()} laedt={laeuft} onClick={festhalten}>
          <Send />
          {t('grossprojekte.verlauf.festhalten')}
        </Button>
      </div>
      {eintraege.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('grossprojekte.akte.verlaufLeer')}</p>
      ) : (
        <Zeitachse eintraege={eintraege} sprache={sprache} nachMonat={false} />
      )}
    </Box>
  )
}
