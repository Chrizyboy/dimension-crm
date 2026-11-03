import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { formatTelefon } from '@/lib/format'
import { ladeAnsprechpersonen, ladeFirmenEinerPerson, type Zugehoerigkeit } from '@/services/zugehoerigkeiten'
import { Box, Leer } from './Box'
import { PersonDialog } from './PersonDialog'

/**
 * Ansprechpersonen einer Firma mit Funktion und Merkern (Hauptkontakt, unterschreibt, Rechnungen, vor Ort).
 * Gleiche Tabelle wie in der Kundenakte (`src/services/zugehoerigkeiten.ts`).
 */
export function PersonenBox({ firmaId, sprache }: { firmaId: string; sprache: 'de' | 'fr' }) {
  const { t } = useTranslation()
  const personen = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'partner', 'personen', firmaId],
    queryFn: () => ladeAnsprechpersonen(firmaId),
  })
  const [offen, setOffen] = useState<Zugehoerigkeit | 'neu' | null>(null)
  const liste = personen.data ?? []
  return (
    <Box
      titel={t('adressbuch.akte.personen', { count: liste.length })}
      rechts={
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={() => {
            setOffen('neu')
          }}
        >
          <Plus />
          {t('adressbuch.akte.personNeu')}
        </Button>
      }
    >
      {personen.isError && <Leer>{t('adressbuch.akte.ladefehler')}</Leer>}
      {personen.isSuccess && liste.length === 0 && <Leer>{t('adressbuch.akte.keinePersonen')}</Leer>}
      {liste.map((p) => (
        <div key={p.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 text-left font-medium hover:underline"
              onClick={() => {
                setOffen(p)
              }}
            >
              {p.hauptkontakt && <Star className="text-warn mr-1 inline size-3.5 fill-current" aria-hidden="true" />}
              {p.personName}
              {p.funktion && <span className="text-muted-foreground font-normal"> · {p.funktion}</span>}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {p.hauptkontakt && <Badge ton="marke">{t('zugehoerigkeit.hauptkontakt')}</Badge>}
            {p.unterschreibt && <Badge>{t('zugehoerigkeit.unterschreibt')}</Badge>}
            {p.rechnungen && <Badge>{t('zugehoerigkeit.rechnungen')}</Badge>}
            {p.vorOrt && <Badge>{t('zugehoerigkeit.vorOrt')}</Badge>}
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {p.telefon && (
              <a href={`tel:${p.telefon}`} className="zahlen inline-flex items-center gap-1 hover:underline">
                <Phone className="size-3" aria-hidden="true" />
                {formatTelefon(p.telefon)}
              </a>
            )}
            {p.email && (
              <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 break-all hover:underline">
                <Mail className="size-3" aria-hidden="true" />
                {p.email}
              </a>
            )}
            {p.bevorzugt && <span>{p.bevorzugt}</span>}
          </div>
        </div>
      ))}
      {offen && (
        <PersonDialog
          firmaId={firmaId}
          sprache={sprache}
          person={offen === 'neu' ? null : offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </Box>
  )
}

/** Bei einer Person: zu welchen Firmen sie gehört (mit Funktion), als Link in deren Akte. */
export function FirmenBox({ personId }: { personId: string }) {
  const { t } = useTranslation()
  const firmen = useQuery({
    queryKey: [...KONTAKT_SCHLUESSEL, 'partner', 'firmen', personId],
    queryFn: () => ladeFirmenEinerPerson(personId),
  })
  if (!firmen.data?.length) return null
  return (
    <Box titel={t('adressbuch.akte.arbeitetBei')}>
      {firmen.data.map((f) => (
        <a key={f.id} href={`#/contacts?kontakt=${f.firmaId}`} className="hover:underline">
          <span className="font-medium">{f.firmaName}</span>
          {f.funktion && <span className="text-muted-foreground"> · {f.funktion}</span>}
        </a>
      ))}
    </Box>
  )
}
