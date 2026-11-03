import { AlertTriangle, BookOpen, Phone, UserCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTelefon } from '@/lib/format'
import { telLink } from '../lib/links'
import { erledigteSchluessel, fehlendeFotos, naechsteSchritte } from '../lib/schritte'
import type { BaustellenInfo } from '../types'
import { Balken } from './Balken'

/**
 * Teil der Tageskarte für Montagen: Fortschritt der Baustelle, was heute dran ist, fehlende Pflichtfotos,
 * Projektleitung zum Anrufen, dazu «Mappe» und «Problem melden».
 */
export function TagKarteInfo({
  info,
  onMappe,
  onMelden,
}: {
  info: BaustellenInfo
  onMappe: () => void
  onMelden: () => void
}) {
  const { t, i18n } = useTranslation()
  const sprache = i18n.language.startsWith('fr') ? 'fr' : 'de'
  const erledigt = erledigteSchluessel(info.erledigt, {})
  const naechste = naechsteSchritte(info.schritte, erledigt)
  const fotos = fehlendeFotos(info.fotos, info.fotos_da)
  const tel = info.pl ? telLink(info.pl.telefon) : null

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <Balken wert={info.fortschritt} beschriftung={t('baustelle.tag.fortschritt')} />
        <span className="zahlen text-muted-foreground w-10 shrink-0 text-right text-xs">{info.fortschritt}%</span>
      </div>
      {naechste.length > 0 && (
        <p>
          <span className="text-muted-foreground">{t('baustelle.tag.dran')} </span>
          {naechste.map((s) => s[sprache]).join(' · ')}
        </p>
      )}
      {fotos.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('baustelle.tag.fotosFehlen', { liste: fotos.map((f) => f[sprache]).join(', ') })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {info.pl && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <UserCog className="size-3.5" aria-hidden="true" />
            {t('baustelle.tag.pl')} {info.pl.name}
            {tel && info.pl.telefon && (
              <a href={tel} className="text-primary inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden="true" />
                {formatTelefon(info.pl.telefon)}
              </a>
            )}
          </span>
        )}
        {info.meldungen_offen > 0 && (
          <Badge ton="warnung">{t('baustelle.tag.meldungenOffen', { count: info.meldungen_offen })}</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onMappe}>
          <BookOpen />
          {t('baustelle.mappe.knopf')}
        </Button>
        <Button variant="secondary" onClick={onMelden}>
          <AlertTriangle />
          {t('baustelle.meldung.knopf')}
        </Button>
      </div>
    </div>
  )
}
