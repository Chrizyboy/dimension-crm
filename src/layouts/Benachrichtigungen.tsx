import { Link, useNavigate } from '@tanstack/react-router'
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { formatRelativ } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBenachrichtigungsListe } from '@/hooks/useBenachrichtigungsListe'
import { zeigeSystemmeldungen } from '@/services/systemmeldung'
import { zaehleUngelesen, type Benachrichtigung, type MeldungsArt } from '@/stores/benachrichtigungen'
import { useUi } from '@/stores/ui'

const ART: Record<MeldungsArt, { icon: LucideIcon; farbe: string }> = {
  info: { icon: Info, farbe: 'text-info bg-info-soft' },
  ok: { icon: CircleCheck, farbe: 'text-ok bg-ok-soft' },
  warnung: { icon: TriangleAlert, farbe: 'text-warn bg-warn-soft' },
  kritisch: { icon: CircleAlert, farbe: 'text-bad bg-bad-soft' },
}

/** Liste der Benachrichtigungen; wird im Aufklappfenster und auf der eigenen Seite verwendet. */
export function BenachrichtigungsListe({ onOeffnen }: { onOeffnen?: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const navigate = useNavigate()
  const { liste, markiereGelesen, entfernen } = useBenachrichtigungsListe()

  if (liste.length === 0) {
    return <Leerzustand icon={Bell} titel={t('benachrichtigungen.leerTitel')} text={t('benachrichtigungen.leerText')} />
  }

  const oeffne = (b: Benachrichtigung) => {
    markiereGelesen(b)
    // Ziele vom Server tragen Suchparameter («/sales?lead=…»), darum als ganze Adresse.
    if (b.ziel) void navigate({ href: b.ziel })
    onOeffnen?.()
  }

  return (
    <ul className="divide-y">
      {liste.map((b) => {
        const { icon: Icon, farbe } = ART[b.art]
        return (
          <li key={b.id} className={cn('group relative flex gap-3 px-4 py-3', !b.gelesen && 'bg-accent-soft/40')}>
            <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', farbe)}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <button
              type="button"
              onClick={() => {
                oeffne(b)
              }}
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left outline-none focus-visible:underline"
            >
              <span className={cn('text-sm', !b.gelesen && 'font-semibold')}>{b.titel[sprache]}</span>
              {b.text && <span className="text-muted-foreground text-xs">{b.text[sprache]}</span>}
              <span className="text-muted-foreground text-xs">{formatRelativ(b.zeit, sprache)}</span>
            </button>
            {!b.gelesen && (
              <span
                role="img"
                className="bg-accent mt-2 size-2 shrink-0 rounded-full"
                aria-label={t('benachrichtigungen.ungelesen')}
              />
            )}
            <button
              type="button"
              onClick={() => {
                entfernen(b)
              }}
              className="text-muted-foreground hover:bg-muted absolute top-2 right-2 rounded p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t('benachrichtigungen.entfernen')}
            >
              <X className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Glocke oben rechts mit Zähler und Aufklappfenster. */
export function Glocke() {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  const { liste, alleGelesen } = useBenachrichtigungsListe()
  const ungelesen = zaehleUngelesen(liste)
  const sprache = useUi((z) => z.sprache)
  useEffect(() => {
    void zeigeSystemmeldungen(
      liste
        .filter((b) => b.popup && !b.gelesen)
        .map((b) => ({ id: b.id, titel: b.titel[sprache], ...(b.text ? { text: b.text[sprache] } : {}) })),
    )
  }, [liste, sprache])

  return (
    <PopoverPrimitive.Root open={offen} onOpenChange={setOffen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            ungelesen > 0 ? t('benachrichtigungen.mitZahl', { anzahl: ungelesen }) : t('benachrichtigungen.titel')
          }
        >
          <Bell />
          {ungelesen > 0 && (
            // Zahl als CSS-Inhalt: Der Name des Knopfs nennt die genaue Anzahl, «9+» ist nur fürs Auge.
            <span
              aria-hidden="true"
              data-zahl={ungelesen > 9 ? '9+' : String(ungelesen)}
              className="zahlen bg-accent text-accent-foreground absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold after:content-[attr(data-zahl)]"
            />
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="animate-hochgleiten bg-surface shadow-pop z-50 flex max-h-[70vh] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border"
        >
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="font-display text-sm font-semibold">{t('benachrichtigungen.titel')}</p>
            {ungelesen > 0 && (
              <Button variant="ghost" size="sm" onClick={alleGelesen}>
                <CheckCheck />
                {t('benachrichtigungen.alleGelesen')}
              </Button>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto">
            <BenachrichtigungsListe
              onOeffnen={() => {
                setOffen(false)
              }}
            />
          </div>
          <Link
            to="/benachrichtigungen"
            onClick={() => {
              setOffen(false)
            }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground border-t px-4 py-2.5 text-center text-xs font-medium"
          >
            {t('benachrichtigungen.alle')}
          </Link>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
