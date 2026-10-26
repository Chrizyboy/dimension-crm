import { ArrowDownToLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatum } from '@/lib/format'
import { useAktualisierung } from '@/stores/aktualisierung'

/** Knopf in der Kopfzeile, sobald eine neue Version bereitliegt, mit dem Fenster «Neue Version». */
export function UpdateKnopf() {
  const { t } = useTranslation()
  const { stand, neu, offen, fortschritt, setOffen, installiere } = useAktualisierung()
  if (!neu || (stand !== 'bereit' && stand !== 'laedt')) return null
  const laedt = stand === 'laedt'

  return (
    <>
      <Button
        size="sm"
        variant="accent"
        onClick={() => {
          setOffen(true)
        }}
      >
        <ArrowDownToLine />
        <span className="hidden sm:inline">{t('update.knopf', { version: neu.version })}</span>
        <span className="sr-only sm:hidden">{t('update.knopf', { version: neu.version })}</span>
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogInhalt
          titel={t('update.titel', { version: neu.version })}
          beschreibung={t('update.text', { jetzt: __APP_VERSION__ })}
          fuss={
            <>
              <Button
                variant="ghost"
                disabled={laedt}
                onClick={() => {
                  setOffen(false)
                }}
              >
                {t('update.spaeter')}
              </Button>
              <Button onClick={() => void installiere()} laedt={laedt}>
                {laedt ? t('update.laedt', { prozent: Math.round(fortschritt * 100) }) : t('update.jetzt')}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-sm">
            {neu.datum && <p className="text-muted-foreground">{t('update.vom', { datum: formatDatum(neu.datum) })}</p>}
            {neu.notizen && <p className="whitespace-pre-line">{neu.notizen}</p>}
            <p className="bg-surface-2 rounded-md border px-3 py-2">{t('update.hinweis')}</p>
          </div>
        </DialogInhalt>
      </Dialog>
    </>
  )
}
