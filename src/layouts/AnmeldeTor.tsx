import { LockKeyhole, LogOut } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { abmelden, speichereMeineSprache } from '@/services/anmeldung'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Sprache } from '@/types/modul'
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

  const sprache = useUi((z) => z.sprache)
  const gerade = useRef(false)
  const imProfil = useRef<Sprache | null>(null)

  useEffect(() => {
    if (!ich) return
    gerade.current = true
    imProfil.current = ich.sprache
    setSprache(ich.sprache)
    if (ich.darstellung === 'hell' || ich.darstellung === 'dunkel' || ich.darstellung === 'system') {
      setDarstellung(ich.darstellung)
    }
    // Nur beim Wechsel der Person, nicht bei jeder Änderung danach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ich?.id])

  // Wechselt die Person die Sprache (Kopfzeile, Menü, Befehl), kommt sie ins Profil. Sonst stellt der nächste
  // Start wieder die alte Sprache ein, samt Logo. Die Übernahme beim Start selbst wird nicht zurückgeschrieben.
  useEffect(() => {
    if (gerade.current) {
      gerade.current = false
      return
    }
    if (!ich || imProfil.current === null || sprache === imProfil.current) return
    imProfil.current = sprache
    void speichereMeineSprache(sprache).catch(() => null)
  }, [sprache, ich])

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
