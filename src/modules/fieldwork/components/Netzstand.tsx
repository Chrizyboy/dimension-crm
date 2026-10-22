import { CloudOff, CloudUpload, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import i18n from '@/i18n'
import { abarbeiten, useWarteschlange, verwerfen } from '../services/warteschlange'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const an = () => {
      setOnline(true)
    }
    const aus = () => {
      setOnline(false)
    }
    window.addEventListener('online', an)
    window.addEventListener('offline', aus)
    return () => {
      window.removeEventListener('online', an)
      window.removeEventListener('offline', aus)
    }
  }, [])
  return online
}

/**
 * Zeigt, ob alles beim Server ist: «Ohne Netz», «3 warten» oder abgelehnte Einträge (mit Grund, verwerfbar).
 * Ohne Netz geht nichts verloren; die Einträge gehen beim nächsten Netz von selbst raus.
 */
export function Netzstand() {
  const { t } = useTranslation()
  const online = useOnline()
  const { offen, abgelehnt, laeuft } = useWarteschlange()
  const [details, setDetails] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      {!online && (
        <Badge ton="warnung">
          <CloudOff />
          {t('baustelle.netz.ohne')}
        </Badge>
      )}
      {offen > 0 && (
        <Button size="sm" variant="secondary" laedt={laeuft} onClick={() => void abarbeiten()}>
          <CloudUpload />
          {t('baustelle.netz.warten', { count: offen })}
        </Button>
      )}
      {abgelehnt.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="text-bad"
          onClick={() => {
            setDetails(true)
          }}
        >
          <TriangleAlert />
          {t('baustelle.netz.abgelehnt', { count: abgelehnt.length })}
        </Button>
      )}
      {details && (
        <Dialog open onOpenChange={setDetails}>
          <DialogInhalt titel={t('baustelle.netz.abgelehntTitel')} beschreibung={t('baustelle.netz.abgelehntText')}>
            <ul className="flex flex-col gap-2">
              {abgelehnt.map((a) => (
                <li key={a.nr} className="flex items-start justify-between gap-3 rounded-md border p-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{t(`baustelle.netz.art.${a.art === 'rpc' ? a.name : 'datei'}`)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {a.fehler && i18n.exists(a.fehler) ? t(a.fehler) : a.fehler}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (a.nr !== undefined) void verwerfen(a.nr)
                    }}
                  >
                    {t('baustelle.netz.verwerfen')}
                  </Button>
                </li>
              ))}
            </ul>
          </DialogInhalt>
        </Dialog>
      )}
    </div>
  )
}
