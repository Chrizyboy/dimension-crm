import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, MessageSquarePlus, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiHinweis } from '@/components/shared/ki/KiHinweis'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Textarea } from '@/components/ui/input'
import { formatRelativ } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { useKiNachher, type KiBezug } from '@/services/ki'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { ladeGespraech, ladeGespraeche, ladeVorlagen, stelleFrage } from '../services/assistent'
import type { Runde } from '../types'
import { Antwort } from './Antwort'

interface Props {
  /** Datensatz, aus dem der Assistent geöffnet wurde (Ctrl J in einer Akte). */
  bezug?: KiBezug | null
  /** Gespräch aus dem Verlauf weiterführen. */
  gespraechId?: string | null
  onGespraech?: (id: string | null) => void
  /** Frage aus einem Auftrag, die gleich gestellt wird. */
  startFrage?: string | null
  /** Im Fenster (Ctrl J): ohne Seitenspalte. */
  kompakt?: boolean
}

/**
 * Fragen ans CRM: in normaler Sprache fragen, der Assistent liest mit den Rechten der Person, antwortet mit einer
 * Tabelle aus echten Werten und schlägt nächste Schritte vor (erst nach dem Klick übernommen).
 */
export function Fragen({ bezug = null, gespraechId = null, onGespraech, startFrage = null, kompakt = false }: Props) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const nachher = useKiNachher()
  const qc = useQueryClient()
  const [sitzung, setSitzung] = useState<{ id: string | null; runden: Runde[] }>({ id: null, runden: [] })
  const [eingabe, setEingabe] = useState('')
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const ende = useRef<HTMLDivElement>(null)
  const gestellt = useRef<string | null>(null)

  // Ein anderes Gespräch aus dem Verlauf laden; das eben selbst begonnene nicht nochmals.
  const fremd = gespraechId !== null && gespraechId !== sitzung.id
  const geladen = useQuery({
    queryKey: ['assistent', 'gespraech', gespraechId],
    enabled: fremd,
    queryFn: () => ladeGespraech(gespraechId ?? ''),
  })
  const id = fremd ? (geladen.data?.id ?? null) : sitzung.id
  const runden = fremd ? (geladen.data?.nachrichten ?? []).filter((r) => !r.dokument) : sitzung.runden

  async function frage(text: string) {
    const f = text.trim()
    if (!f || laeuft) return
    setLaeuft(f)
    setEingabe('')
    try {
      const r = await stelleFrage({ frage: f, sprache, gespraechId: id, bezug: id ? null : bezug })
      setSitzung({ id: r.gespraech_id, runden: [...runden, r.runde] })
      if (r.gespraech_id !== gespraechId) onGespraech?.(r.gespraech_id)
      void qc.invalidateQueries({ queryKey: ['assistent', 'gespraeche'] })
    } catch (e) {
      setEingabe(f)
      meldeIntegrationsFehler(e)
    } finally {
      setLaeuft(null)
      nachher()
    }
  }

  // Frage aus einem Auftrag einmal stellen.
  useEffect(() => {
    if (startFrage && gestellt.current !== startFrage) {
      gestellt.current = startFrage
      void frage(startFrage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFrage])

  useEffect(() => {
    ende.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [runden.length, laeuft])

  const neu = () => {
    setSitzung({ id: null, runden: [] })
    onGespraech?.(null)
  }

  const verlauf = (
    <div className="flex min-w-0 flex-col gap-5">
      {runden.map((r, i) => (
        <Antwort key={`${r.am}-${i}`} runde={r} />
      ))}
      {laeuft && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="bg-info-soft max-w-[85%] self-end rounded-xl rounded-br-sm px-3 py-2 text-sm">{laeuft}</div>
          <div className="border-accent flex flex-col gap-2 border-l-2 pl-3">
            <span className="text-muted-foreground text-xs">{t('assistent.liest')}</span>
            <Skelett className="h-4 w-3/4" />
            <Skelett className="h-24 w-full" />
          </div>
        </div>
      )}
      <div ref={ende} />
    </div>
  )

  const feld = (
    <form
      className="bg-surface border-accent focus-within:ring-ring flex items-end gap-2 rounded-xl border-[1.5px] p-2 focus-within:ring-2"
      onSubmit={(e) => {
        e.preventDefault()
        void frage(eingabe)
      }}
    >
      <Sparkles className="text-accent mb-2 ml-1 size-4 shrink-0" aria-hidden="true" />
      <Textarea
        id="assistent-frage"
        value={eingabe}
        rows={1}
        aria-label={t('assistent.frageLabel')}
        placeholder={bezug && !id ? t('assistent.platzhalterBezug') : t('assistent.platzhalter')}
        className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        onChange={(e) => {
          setEingabe(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void frage(eingabe)
          }
        }}
      />
      <Button type="submit" size="sm" disabled={!eingabe.trim() || Boolean(laeuft)} aria-label={t('assistent.fragen')}>
        <ArrowUp />
      </Button>
    </form>
  )

  if (kompakt) {
    return (
      <div className="flex flex-col gap-4">
        {runden.length === 0 && !laeuft && <Beispiele onFrage={(f) => void frage(f)} />}
        {verlauf}
        {feld}
        {runden.length > 0 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={neu}>
            <MessageSquarePlus />
            {t('assistent.neuesGespraech')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {feld}
        {runden.length === 0 && !laeuft && !geladen.isLoading && <Beispiele onFrage={(f) => void frage(f)} />}
        {verlauf}
        {runden.length > 0 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={neu}>
            <MessageSquarePlus />
            {t('assistent.neuesGespraech')}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <KiHinweis />
        <LetzteGespraeche
          aktiv={id}
          onOeffnen={(g) => {
            onGespraech?.(g)
          }}
        />
      </div>
    </div>
  )
}

/** Gute Fragen passend zur Rolle (aus den Aufträgen der Art «frage»). */
function Beispiele({ onFrage }: { onFrage: (f: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const rolle = useAnmeldung((z) => z.ich?.rolle ?? '')
  const v = useQuery({ queryKey: ['assistent', 'vorlagen'], queryFn: ladeVorlagen, staleTime: 5 * 60_000 })
  const fragen = (v.data ?? [])
    .filter((x) => x.art === 'frage' && (x.rollen.length === 0 || x.rollen.includes(rolle) || rolle === 'admin'))
    .slice(0, 5)
  if (!fragen.length) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-semibold">{t('assistent.guteFragen')}</h2>
      <div className="flex flex-wrap gap-2">
        {fragen.map((f) => (
          <button
            key={f.id}
            type="button"
            className="bg-surface hover:border-border-strong focus-visible:ring-ring rounded-full border px-3 py-1 text-sm outline-none focus-visible:ring-2"
            onClick={() => {
              onFrage(f.auftrag)
            }}
          >
            {sprache === 'fr' ? f.titel_fr : f.titel_de}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Die letzten Gespräche, zum Weiterführen. */
function LetzteGespraeche({ aktiv, onOeffnen }: { aktiv: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const g = useQuery({ queryKey: ['assistent', 'gespraeche'], queryFn: ladeGespraeche })
  const liste = (g.data ?? []).filter((x) => x.art === 'frage').slice(0, 6)
  return (
    <section className="bg-surface flex flex-col gap-2 rounded-xl border p-4">
      <h2 className="font-display text-sm font-semibold">{t('assistent.letzteGespraeche')}</h2>
      {g.isLoading ? (
        <Skelett className="h-16" />
      ) : liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('assistent.nochKeine')}</p>
      ) : (
        <ul className="flex flex-col">
          {liste.map((x) => (
            <li key={x.id} className="border-b last:border-0">
              <button
                type="button"
                aria-current={x.id === aktiv}
                className="hover:bg-muted aria-[current=true]:bg-muted flex w-full items-center justify-between gap-2 rounded px-1 py-2 text-left text-sm"
                onClick={() => {
                  onOeffnen(x.id)
                }}
              >
                <span className="truncate">{x.titel}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{formatRelativ(x.geaendert_am, sprache)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
