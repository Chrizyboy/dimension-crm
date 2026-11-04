import { Plus } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LeereZeigen } from './leereZeile'

/**
 * Bereich einer Akte (Abschnitt, Box), der leere Zeilen erst nach «+ n weitere Angaben» zeigt
 * (Chris 4.11.2026 «Ja, in allen Akten», Entscheid 0058). Gezählt wird im fertigen Bild, damit jede Zeile mit
 * `useLeerZeile` mitmacht, ohne dass der Bereich ihre Werte kennt; innere Bereiche zählen selbst.
 */
export function LeereFelderBereich({ className, children }: { className?: string; children: ReactNode }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [offen, setOffen] = useState(false)
  const [anzahl, setAnzahl] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const n = [...el.querySelectorAll('[data-leer]')].filter((z) => z.closest('[data-leer-bereich]') === el).length
    setAnzahl(n)
  }, [children, offen])

  return (
    <div ref={ref} data-leer-bereich="" className={className}>
      <LeereZeigen.Provider value={offen}>{children}</LeereZeigen.Provider>
      {!offen && anzahl > 0 && (
        <button
          type="button"
          onClick={() => {
            setOffen(true)
          }}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded py-1 text-xs outline-none focus-visible:ring-2"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t('akte.leereFelder', { count: anzahl })}
        </button>
      )}
    </div>
  )
}
