import { Archive, Check, Clock, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/usePosteingang'
import { zurueckZeiten } from '../lib/zeiten'
import { ablegen, erledigen, zurueckstellen, zuweisen } from '../services/posteingang'

/**
 * Leiste über der Liste, sobald Mails markiert sind: alle erledigt, ablegen, zurückstellen oder einer Person geben.
 * Jede Mail läuft einzeln über `posteingang_setzen`, damit Regeln und Protokoll gleich bleiben wie beim Einzelklick.
 */
export function Sammelleiste({ ids, onFertig }: { ids: string[]; onFertig: () => void }) {
  const { t } = useTranslation()
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const alle = (f: (id: string) => Promise<unknown>, erfolg: { de: string; fr: string }) =>
    void aus(() => Promise.all(ids.map(f)), erfolg).then((ok) => {
      if (ok) onFertig()
    })
  const n = ids.length
  return (
    <div
      role="toolbar"
      aria-label={t('posteingang.sammel.titel', { count: n })}
      className="bg-accent-soft border-accent flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
    >
      <span className="text-sm font-semibold">{t('posteingang.sammel.titel', { count: n })}</span>
      <Button
        size="sm"
        variant="secondary"
        laedt={laeuft}
        onClick={() => {
          alle(erledigen, { de: `${n} erledigt`, fr: `${n} terminés` })
        }}
      >
        <Check />
        {t('posteingang.akte.erledigt')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        laedt={laeuft}
        onClick={() => {
          alle(ablegen, { de: `${n} abgelegt`, fr: `${n} classés` })
        }}
      >
        <Archive />
        {t('posteingang.akte.ablegen')}
      </Button>
      <Menue>
        <MenueAusloeser asChild>
          <Button size="sm" variant="secondary">
            <Clock />
            {t('posteingang.akte.zurueckstellen')}
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="start">
          {zurueckZeiten().map((z) => (
            <MenueEintrag
              key={z.wahl}
              onSelect={() => {
                alle((id) => zurueckstellen(id, z.bis), { de: `${n} zurückgestellt`, fr: `${n} mis de côté` })
              }}
            >
              {t(`posteingang.zurueck.${z.wahl}`)}
            </MenueEintrag>
          ))}
        </MenueInhalt>
      </Menue>
      <Auswahl
        className="w-48"
        aria-label={t('posteingang.sammel.geben')}
        value=""
        platzhalter={t('posteingang.sammel.geben')}
        onValueChange={(p) => {
          if (p) alle((id) => zuweisen(id, p), { de: `${n} weitergegeben`, fr: `${n} transmis` })
        }}
        optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
      />
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto"
        onClick={onFertig}
        aria-label={t('posteingang.sammel.aufheben')}
      >
        <X />
      </Button>
    </div>
  )
}
