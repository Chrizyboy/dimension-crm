import { LockKeyhole, LogOut } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { abmelden } from '@/services/anmeldung'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { Anmeldeseite } from './Anmeldeseite'

/**
 * Lässt nur angemeldete Mitarbeitende in die App. Ohne Datenbank (Vorschau) geht es direkt weiter.
 * Übernimmt nach der Anmeldung Sprache und Darstellung der Person, damit jede Person ihr CRM gleich vorfindet.
 */
export function AnmeldeTor({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { status, ich, loginEmail } = useAnmeldung()
  const { setSprache, setDarstellung } = useUi()

  useEffect(() => {
    if (!ich) return
    setSprache(ich.sprache)
    if (ich.darstellung === 'hell' || ich.darstellung === 'dunkel' || ich.darstellung === 'system') {
      setDarstellung(ich.darstellung)
    }
    // Nur beim Wechsel der Person, nicht bei jeder Änderung danach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ich?.id])

  if (status === 'laden') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" aria-busy="true">
        <Logo className="h-9" />
        <Skelett className="h-2 w-40" />
        <span className="sr-only">{t('anmeldung.laden')}</span>
      </div>
    )
  }
  if (status === 'abgemeldet') return <Anmeldeseite />
  if (status === 'kein-zugang') {
    return (
      <div className="flex h-full items-center justify-center">
        <Leerzustand
          icon={LockKeyhole}
          titel={t('anmeldung.keinZugangTitel')}
          text={t('anmeldung.keinZugangText', { email: loginEmail ?? '' })}
          aktion={
            <Button variant="secondary" onClick={() => void abmelden()}>
              <LogOut />
              {t('anmeldung.abmelden')}
            </Button>
          }
        />
      </div>
    )
  }
  return children
}
