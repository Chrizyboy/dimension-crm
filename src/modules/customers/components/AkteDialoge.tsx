import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import type { useAkteAktionen } from '../hooks/useAkteAktionen'
import type { Kundenakte } from '../types'
import { AktivitaetDialog } from './AktivitaetDialog'
import KontaktDialog from './KontaktDialog'
import { ObjektDialog } from './ObjektDialog'

/** Die Dialoge über der Akte; `aktionen` kommt aus `useAkteAktionen`. */
export function AkteDialoge({
  id,
  akte,
  titel,
  aktionen,
}: {
  id: string
  akte: Kundenakte | null | undefined
  titel: string
  aktionen: ReturnType<typeof useAkteAktionen>
}) {
  const { t } = useTranslation()
  const { offen, setOffen, papierkorb, verschiebe } = aktionen
  const zu = () => {
    setOffen(null)
  }
  return (
    <>
      {offen?.art === 'kontakt' && akte && (
        <KontaktDialog kontaktart={akte.kontakt.kontaktart} kontakt={akte.kontakt} onSchliessen={zu} />
      )}
      {offen?.art === 'aktivitaet' && <AktivitaetDialog kontaktId={id} onSchliessen={zu} />}
      {offen?.art === 'objekt' && <ObjektDialog kontaktId={id} objekt={offen.objekt} onSchliessen={zu} />}
      {offen?.art === 'papierkorb' && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) zu()
          }}
        >
          <DialogInhalt
            titel={t('akte.papierkorbTitel')}
            beschreibung={t('akte.papierkorbText', { name: titel })}
            fuss={
              <>
                <Button variant="secondary" onClick={zu}>
                  {t('allgemein.abbrechen')}
                </Button>
                <Button variant="danger" laedt={papierkorb.isPending} onClick={() => void verschiebe(true)}>
                  {t('akte.inPapierkorb')}
                </Button>
              </>
            }
          />
        </Dialog>
      )}
    </>
  )
}
