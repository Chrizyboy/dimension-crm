import { ClipboardCheck, Globe, Mail, MessageSquare, Phone, Send, Settings2, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useService'
import { verlaufEintragen } from '../services/akte'
import { VERLAUF_ARTEN, type Akte, type ServiceFall, type VerlaufArt } from '../types'
import { Box, Zeile } from './Box'

const SYMBOL = { notiz: StickyNote, anruf: Phone, mail: Mail, sms: MessageSquare, system: Settings2 } as const
const TON: Record<string, string> = {
  anruf: 'bg-info-soft text-info',
  mail: 'bg-muted text-muted-foreground',
  sms: 'bg-muted text-muted-foreground',
  system: 'bg-ok-soft text-ok',
}

/**
 * Verlauf des Falls: oben festhalten, was passiert ist (Notiz, Anruf, Mail, SMS), darunter alles in einer
 * Zeitachse: Einträge, zugeordnete Mails aus dem Posteingang, Rapporte und die Meldung von der Website.
 */
export function VerlaufBox({ f, akte }: { f: ServiceFall; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const personen = usePersonen()
  const { laeuft, aus } = useAktion()
  const [art, setArt] = useState<VerlaufArt>('notiz')
  const [text, setText] = useState('')
  const name = (id: string | null) => (id ? (personen.data?.find((p) => p.id === id)?.name ?? '') : '')

  const eintraege: Zeitpunkt[] = [
    ...f.verlauf.map((v, i) => ({
      id: `v${String(i)}`,
      zeitpunkt: v.am,
      icon: v.art && v.art in SYMBOL ? SYMBOL[v.art as keyof typeof SYMBOL] : StickyNote,
      titel: t(`service.verlauf.${v.art ?? 'notiz'}`),
      text: v.text,
      meta: name(v.person_id),
      ton: TON[v.art ?? ''],
    })),
    ...(akte?.mails ?? []).map((m) => ({
      id: `m${m.id}`,
      zeitpunkt: m.eingang_am,
      icon: Mail,
      titel: `${t('service.verlauf.mailEingang')}: ${m.betreff ?? ''}`,
      text: m.zusammenfassung ?? undefined,
      meta: m.von_name ?? m.von_email ?? '',
    })),
    ...(akte?.rapporte ?? []).map((r) => ({
      id: `r${r.id}`,
      zeitpunkt: r.abgeschlossen_am ?? `${r.datum}T12:00:00Z`,
      icon: ClipboardCheck,
      titel: `${t('service.verlauf.rapport')} ${r.nummer}`,
      text: r.arbeiten ?? undefined,
      meta: r.person ?? '',
      ton: 'bg-accent-soft text-accent-ink',
    })),
    ...(f.quelle === 'website'
      ? []
      : [{ id: 'neu', zeitpunkt: f.erstellt_am, icon: Settings2, titel: t('service.akte.erfasst') }]),
  ].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))

  return (
    <Box titel={t('service.akte.verlauf')} rechts={String(eintraege.length)}>
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
        <Filterchips
          einzeln
          beschriftung={t('service.verlauf.art')}
          optionen={VERLAUF_ARTEN.map((a) => ({ wert: a, text: t(`service.verlauf.${a}`) }))}
          gewaehlt={[art]}
          onChange={([a]) => {
            if (a) setArt(a as VerlaufArt)
          }}
        />
        <Textarea
          aria-label={t('service.verlauf.text')}
          placeholder={t(`service.verlauf.platzhalter.${art}`)}
          rows={2}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) {
              void aus(() => verlaufEintragen(f.id, art, text)).then((ok) => {
                if (ok) setText('')
              })
            }
          }}
        />
        <Button
          size="sm"
          className="self-end"
          disabled={!text.trim()}
          laedt={laeuft}
          onClick={() => {
            void aus(() => verlaufEintragen(f.id, art, text)).then((ok) => {
              if (ok) setText('')
            })
          }}
        >
          <Send />
          {t('service.verlauf.festhalten')}
        </Button>
      </div>
      <Zeitachse eintraege={eintraege} sprache={sprache} nachMonat={false} />
      {f.meldung && (
        <section className="border-t pt-2">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Globe className="size-4" aria-hidden="true" />
            {t('service.meldung.titel')}
          </h3>
          <dl className="flex flex-col gap-1 text-sm">
            <Zeile label={t('service.meldung.name')}>{f.meldung.name}</Zeile>
            <Zeile label={t('service.akte.mail')}>{f.meldung.email}</Zeile>
            <Zeile label={t('service.akte.telefon')}>{f.meldung.telefon}</Zeile>
            <Zeile label={t('service.meldung.adresse')}>{f.meldung.adresse}</Zeile>
            <Zeile label={t('service.meldung.projekt')}>{f.meldung.projekt}</Zeile>
            <Zeile label={t('service.meldung.stoerung')}>{f.meldung.stoerung}</Zeile>
            <Zeile label={t('service.meldung.text')}>
              {f.meldung.text && <span className="whitespace-pre-wrap">{f.meldung.text}</span>}
            </Zeile>
            <Zeile label={t('service.meldung.einwilligung')}>
              {/* Ohne Einwilligung legt die Datenbank keinen Fall an; der Wortlaut kommt nur mit, wenn die Website ihn schickt. */}
              {f.meldung.einwilligung
                ? `${t('service.meldung.ja')} · ${f.meldung.einwilligung}`
                : t('service.meldung.ja')}
            </Zeile>
          </dl>
        </section>
      )}
    </Box>
  )
}
