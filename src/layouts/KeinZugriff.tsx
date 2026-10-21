import { Link } from '@tanstack/react-router'
import { LockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { buttonVariants } from '@/components/ui/button'

/** Hinweis, wenn jemand über eine Adresse einen Bereich öffnet, der für die eigene Rolle nicht freigegeben ist. */
export function KeinZugriff() {
  const { t } = useTranslation()
  return (
    <Leerzustand
      className="py-24"
      icon={LockKeyhole}
      titel={t('anmeldung.keinZugriffTitel')}
      text={t('anmeldung.keinZugriffText')}
      aktion={
        <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
          {t('fehler.startseite')}
        </Link>
      }
    />
  )
}
