import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { fristTon, PRIO_TON } from '../lib/anzeige'
import { anschreibenAendern, volltext } from '../services/ausschreibungen'
import type { Anschreiben } from '../types'

const KANAL_ICON = { mail: Mail, brief: Printer, anruf: Phone }

/**
 * Vorschau eines Anschreibens: so geht es hinaus. Im Entwurf sind Betreff und Text änderbar; Signatur und
 * Abmelde-Satz hängt die Datenbank an, sie sind hier nur zu sehen (Konzept: fest, nicht änderbar).
 */
export function AnschreibenVorschau({
  a,
  aenderbar,
  onDossier,
}: {
  a: Anschreiben
  aenderbar: boolean
  onDossier: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [betreff, setBetreff] = useState(a.betreff)
  const [text, setText] = useState(a.text)
  const voll = useQuery({ queryKey: ['ausschreibungen', 'volltext', a.id, a.text], queryFn: () => volltext(a.id) })
  const fest = voll.data?.startsWith(a.text) ? voll.data.slice(a.text.length).trim() : ''
  const geaendert = betreff !== a.betreff || text !== a.text
  const Icon = KANAL_ICON[a.kanal]

  return (
    <section
      aria-label={t('ausschreibungen.freigabe.vorschau')}
      className="bg-surface flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        <span className="font-medium">{t(`ausschreibungen.kanal.${a.kanal}`)}</span>
        {a.art === 'nachfassen' && <Badge ton="warnung">{t('ausschreibungen.nachfassen')}</Badge>}
        {a.dossier.prioritaet && <Badge ton={PRIO_TON[a.dossier.prioritaet]}>{a.dossier.prioritaet}</Badge>}
        {a.dossier.frist && <Badge ton={fristTon(a.dossier.frist)}>{formatDatum(a.dossier.frist)}</Badge>}
        <Button
          size="sm"
          variant="link"
          className="ml-auto"
          onClick={() => {
            onDossier(a.ausschreibung_id)
          }}
        >
          {a.dossier.nummer}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {t('ausschreibungen.freigabe.an')}: <span className="text-foreground">{a.empfaenger}</span>
        {a.an ? ` · ${a.an}` : ''}
      </p>
      {aenderbar ? (
        <>
          <Feld id={`as-betreff-${a.id}`} label={t('ausschreibungen.freigabe.betreff')}>
            <Input
              id={`as-betreff-${a.id}`}
              value={betreff}
              onChange={(e) => {
                setBetreff(e.target.value)
              }}
            />
          </Feld>
          <Feld id={`as-text-${a.id}`} label={t('ausschreibungen.freigabe.text')}>
            <Textarea
              id={`as-text-${a.id}`}
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          {geaendert && (
            <div className="flex justify-end">
              <Button
                size="sm"
                laedt={laeuft}
                onClick={() =>
                  void aus(() => anschreibenAendern(a.id, betreff, text), { de: 'Gespeichert', fr: 'Enregistré' })
                }
              >
                {t('allgemein.speichern')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="font-medium">{a.betreff}</p>
          <p className="text-sm whitespace-pre-wrap">{a.text}</p>
        </>
      )}
      {fest && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-1 text-xs">{t('ausschreibungen.freigabe.fest')}</p>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{fest}</p>
        </div>
      )}
      {a.bewilligt_durch && (
        <p className="text-muted-foreground text-xs">
          {t('ausschreibungen.freigabe.bewilligtVon', { name: a.bewilligt_durch })}
        </p>
      )}
    </section>
  )
}
