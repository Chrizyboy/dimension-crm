import { Building2, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fehlerText } from '@/services/integrationen'
import { sucheImUidRegister } from '../services/anlegen'
import type { UidFirma } from '../types'

/**
 * Firma im UID-Register des Bundes suchen (Chris 03.11.2026). Ein Klick übernimmt Name, UID, Rechtsform und
 * Adresse ins Formular; nichts wird ohne Klick übernommen.
 */
export function UidSuche({ name, onWahl }: { name: string; onWahl: (f: UidFirma) => void }) {
  const { t } = useTranslation()
  const [treffer, setTreffer] = useState<UidFirma[] | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function suchen() {
    setLaedt(true)
    setFehler(null)
    try {
      setTreffer(await sucheImUidRegister(name))
    } catch (f) {
      setFehler(fehlerText(f))
      setTreffer(null)
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        laedt={laedt}
        disabled={name.trim().length < 3}
        onClick={() => void suchen()}
      >
        <Search />
        {t('adressbuch.neuDialog.uidSuchen')}
      </Button>
      {fehler && <p className="text-bad text-xs">{fehler}</p>}
      {treffer && treffer.length === 0 && (
        <p className="text-muted-foreground text-xs">{t('adressbuch.neuDialog.uidKeine')}</p>
      )}
      {treffer && treffer.length > 0 && (
        <ul
          className="bg-muted/50 flex flex-col gap-0.5 rounded-md p-1.5"
          aria-label={t('adressbuch.neuDialog.uidTreffer')}
        >
          {treffer.map((f) => (
            <li key={f.uid}>
              <button
                type="button"
                className="hover:bg-surface focus-visible:ring-ring flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2"
                onClick={() => {
                  onWahl(f)
                  setTreffer(null)
                }}
              >
                <Building2 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-muted-foreground zahlen text-xs">
                    {[f.uid, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {!f.aktiv && (
                  <Badge ton="warnung" className="ml-auto">
                    {t('adressbuch.neuDialog.uidInaktiv')}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
