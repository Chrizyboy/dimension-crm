import { useNavigate, useRouterState } from '@tanstack/react-router'
import { CircleHelp } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MODULE } from '@/lib/navigation'
import { HilfePanel } from '@/modules/knowledge'

/** Bereich zur aktuellen Adresse: «/quotes» und «/quotes/…» gehören zu Offerten. */
function bereichZu(pfad: string): string | null {
  const m = MODULE.find((x) => pfad === x.pfad || pfad.startsWith(`${x.pfad}/`))
  return m && m.id !== 'knowledge' ? m.id : null
}

/**
 * «?» in der Kopfzeile und F1 überall (wie unter Windows gewohnt): öffnet das Handbuch-Kapitel des Bereichs, in dem
 * die Person gerade ist, als Seitenblatt. Ausserhalb eines Bereichs (Mein Konto, Handbuch) öffnet es das Handbuch.
 */
export function HilfeKnopf() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pfad = useRouterState({ select: (s) => s.location.pathname })
  const [offen, setOffen] = useState<string | null>(null)

  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key !== 'F1') return
      e.preventDefault()
      const b = bereichZu(pfad)
      if (b) setOffen(b)
      else void navigate({ to: '/knowledge' })
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [pfad, navigate])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('handbuch.hilfe.knopf')}
        title={t('handbuch.hilfe.knopf')}
        onClick={() => {
          const b = bereichZu(pfad)
          if (b) setOffen(b)
          else void navigate({ to: '/knowledge' })
        }}
      >
        <CircleHelp aria-hidden="true" />
      </Button>
      {offen && (
        <Suspense>
          <HilfePanel
            bereich={offen}
            onSchliessen={() => {
              setOffen(null)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
