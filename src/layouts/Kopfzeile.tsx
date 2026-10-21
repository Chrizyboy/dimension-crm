import { Monitor, Moon, PanelLeft, Search, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useUi, type Darstellung } from '@/stores/ui'

const NAECHSTE: Record<Darstellung, Darstellung> = { system: 'hell', hell: 'dunkel', dunkel: 'system' }

/** Obere Leiste: Seitenleiste ein/aus, Suche (Befehlspalette ab Phase 2), Sprache, Hell/Dunkel. */
export function Kopfzeile() {
  const { t } = useTranslation()
  const { sprache, darstellung, setSprache, setDarstellung, toggleSeitenleiste } = useUi()
  const DarstIcon = darstellung === 'hell' ? Sun : darstellung === 'dunkel' ? Moon : Monitor

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <Button variant="ghost" size="icon" onClick={toggleSeitenleiste} aria-label="Seitenleiste ein- oder ausblenden">
        <PanelLeft className="size-4" />
      </Button>
      {/* Am Handy fehlt die Seitenleiste mit dem Logo, deshalb hier das Zeichen. */}
      <img src="./icon.svg" alt="Dimension Solaire" className="size-7 md:hidden" />
      <div className="bg-surface text-muted-foreground flex h-8 max-w-md flex-1 items-center gap-2 rounded-md border px-2.5 text-sm">
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 truncate">{t('nav.suchen')}</span>
        <kbd className="rounded border px-1.5 text-[11px]">Ctrl K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSprache(sprache === 'de' ? 'fr' : 'de')
          }}
          aria-label={t('einstellungen.sprache')}
        >
          {sprache.toUpperCase()}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setDarstellung(NAECHSTE[darstellung])
          }}
          aria-label={`${t('einstellungen.darstellung')}: ${t(`einstellungen.${darstellung}`)}`}
          title={t(`einstellungen.${darstellung}`)}
        >
          <DarstIcon className="size-4" />
        </Button>
      </div>
    </header>
  )
}
