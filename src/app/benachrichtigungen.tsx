import { createFileRoute } from '@tanstack/react-router'
import { CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { BenachrichtigungsListe } from '@/layouts/Benachrichtigungen'
import { useBenachrichtigungsListe } from '@/hooks/useBenachrichtigungsListe'

/** Alle Benachrichtigungen auf einer Seite (vor allem fürs Handy). */
export const Route = createFileRoute('/benachrichtigungen')({
  component: function BenachrichtigungenSeite() {
    const { t } = useTranslation()
    const { alleGelesen } = useBenachrichtigungsListe()
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Seitenkopf
          titel={t('benachrichtigungen.titel')}
          aktionen={
            <Button variant="secondary" onClick={alleGelesen}>
              <CheckCheck />
              {t('benachrichtigungen.alleGelesen')}
            </Button>
          }
        />
        <Karte className="overflow-hidden">
          <BenachrichtigungsListe />
        </Karte>
      </div>
    )
  },
})
