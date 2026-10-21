import { Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, Kbd } from '@/components/ui/diverses'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { Abschnitt, Beispiel } from './Abschnitt'

/** Knöpfe, Statusmarken, Avatare und Tastenkürzel. */
export function AbschnittBedienung() {
  const { t } = useTranslation()
  const [laedt, setLaedt] = useState(false)

  return (
    <Abschnitt id="bedienung" titel={t('design.bedienung')} text={t('design.bedienungText')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Beispiel titel={t('design.knoepfe')}>
          <Button>
            <Plus />
            {t('design.neuerLead')}
          </Button>
          <Button variant="accent">
            <Send />
            {t('design.offerteSenden')}
          </Button>
          <Button variant="secondary">{t('allgemein.abbrechen')}</Button>
          <Button variant="ghost">{t('design.mehr')}</Button>
          <Button variant="danger">
            <Trash2 />
            {t('design.papierkorb')}
          </Button>
          <Button variant="link">{t('design.link')}</Button>
        </Beispiel>
        <Beispiel titel={t('design.groessenZustaende')}>
          <Button size="sm">{t('design.klein')}</Button>
          <Button>{t('design.normal')}</Button>
          <Button size="lg">{t('design.gross')}</Button>
          <Button disabled>{t('design.gesperrt')}</Button>
          <Button
            variant="secondary"
            laedt={laedt}
            onClick={() => {
              setLaedt(true)
              setTimeout(() => {
                setLaedt(false)
              }, 1500)
            }}
          >
            {laedt ? t('design.speichert') : t('allgemein.speichern')}
          </Button>
        </Beispiel>
        <Beispiel titel={t('design.statusmarken')}>
          <Badge ton="neutral">{t('design.status.entwurf')}</Badge>
          <Badge ton="info" punkt>
            {t('design.status.versendet')}
          </Badge>
          <Badge ton="marke" punkt>
            {t('design.status.inVerhandlung')}
          </Badge>
          <Badge ton="ok" punkt>
            {t('design.status.angenommen')}
          </Badge>
          <Badge ton="warnung" punkt>
            {t('design.status.faellig')}
          </Badge>
          <Badge ton="kritisch" punkt>
            {t('design.status.ueberfaellig')}
          </Badge>
        </Beispiel>
        <Beispiel titel={t('design.personenKuerzel')}>
          <Avatar name="Chris Rosenberg" />
          <Avatar name="Andreas Meyer" />
          <Avatar name="Loris" />
          <Avatar name="Innendienst Bulle" />
          <span className="text-muted-foreground ml-3 flex items-center gap-1.5 text-xs">
            <Kbd>{kuerzelText('k')}</Kbd> {t('design.kuerzelSuche')}
            <Kbd className="ml-2">{kuerzelText('b')}</Kbd> {t('design.kuerzelLeiste')}
          </span>
        </Beispiel>
      </div>
    </Abschnitt>
  )
}
