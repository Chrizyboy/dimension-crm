import { useQuery } from '@tanstack/react-query'
import { Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatTelefon } from '@/lib/format'
import { ladeAnsprechpersonen, ladeFirmenEinerPerson, type Zugehoerigkeit } from '@/services/zugehoerigkeiten'
import { Box, Leer } from './Box'

/** Merker einer Ansprechperson als kleine Abzeichen (wer unterschreibt, wer Rechnungen bekommt …). */
function Merker({ z }: { z: Zugehoerigkeit }) {
  const { t } = useTranslation()
  const merker = [
    z.hauptkontakt && t('kundenseite.personen.hauptkontakt'),
    z.unterschreibt && t('kundenseite.personen.unterschreibt'),
    z.rechnungen && t('kundenseite.personen.rechnungen'),
    z.vorOrt && t('kundenseite.personen.vorOrt'),
  ].filter((m): m is string => Boolean(m))
  if (merker.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {merker.map((m) => (
        <Badge key={m}>{m}</Badge>
      ))}
    </span>
  )
}

/** Eine Person oder Firma mit Funktion, Merkern und direkten Nummern; der Name öffnet sie im Adressbuch. */
function Zeile({ z, andere }: { z: Zugehoerigkeit; andere: 'person' | 'firma' }) {
  const id = andere === 'person' ? z.personId : z.firmaId
  const name = andere === 'person' ? z.personName : z.firmaName
  return (
    <div className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <a href={`#/contacts?kontakt=${id}`} className="font-medium hover:underline">
          {name}
        </a>
        {z.funktion && <span className="text-muted-foreground text-xs">{z.funktion}</span>}
      </div>
      <Merker z={z} />
      {andere === 'person' && (z.telefon || z.email) && (
        <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
          {z.telefon && (
            <a href={`tel:${z.telefon.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:underline">
              <Phone className="size-3" aria-hidden="true" />
              {formatTelefon(z.telefon)}
            </a>
          )}
          {z.email && (
            <a href={`mailto:${z.email}`} className="inline-flex items-center gap-1 hover:underline">
              <Mail className="size-3" aria-hidden="true" />
              {z.email}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Ansprechpersonen am Kunden (Firma oder Haushalt) und die Firmen, zu denen eine Person gehört.
 * Gepflegt werden sie im Adressbuch; hier sieht man sie, wo man sie braucht.
 */
export function PersonenBox({ kontaktId }: { kontaktId: string }) {
  const { t } = useTranslation()
  const personen = useQuery({
    queryKey: ['zugehoerigkeiten', 'firma', kontaktId],
    queryFn: () => ladeAnsprechpersonen(kontaktId),
  })
  const firmen = useQuery({
    queryKey: ['zugehoerigkeiten', 'person', kontaktId],
    queryFn: () => ladeFirmenEinerPerson(kontaktId),
  })
  const p = personen.data ?? []
  const f = firmen.data ?? []
  return (
    <Box
      titel={t('kundenseite.personen.titel')}
      rechts={
        <a href={`#/contacts?kontakt=${kontaktId}`} className="hover:underline">
          {t('kundenseite.personen.imAdressbuch')}
        </a>
      }
    >
      {p.map((z) => (
        <Zeile key={z.id} z={z} andere="person" />
      ))}
      {f.length > 0 && (
        <>
          <h3 className="text-muted-foreground mt-1 text-xs font-medium">{t('kundenseite.personen.firmen')}</h3>
          {f.map((z) => (
            <Zeile key={z.id} z={z} andere="firma" />
          ))}
        </>
      )}
      {!personen.isPending && !firmen.isPending && p.length === 0 && f.length === 0 && (
        <Leer>{t('kundenseite.personen.keine')}</Leer>
      )}
    </Box>
  )
}
