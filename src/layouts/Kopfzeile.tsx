import { useNavigate } from '@tanstack/react-router'
import { Check, Languages, LogOut, Monitor, Moon, Search, Sun, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, Kbd } from '@/components/ui/diverses'
import {
  Menue,
  MenueAusloeser,
  MenueEintrag,
  MenueInhalt,
  MenueRadio,
  MenueRadioGruppe,
  MenueTitel,
  MenueTrenner,
} from '@/components/ui/menue'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { abmelden } from '@/services/anmeldung'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi, type Darstellung } from '@/stores/ui'
import { Glocke } from './Benachrichtigungen'

/** Obere Leiste: Suche/Befehlspalette, Sprache, Benachrichtigungen, Konto-Menü. */
export function Kopfzeile() {
  const { t } = useTranslation()
  const { sprache, darstellung, setSprache, setDarstellung, setBefehlspalette } = useUi()
  const ich = useAnmeldung((z) => z.ich)
  const navigate = useNavigate()
  const name = ich?.name ?? t('konto.vorschau')

  return (
    <header className="bg-surface flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      {/* Am Handy fehlt die Seitenleiste mit dem Logo, deshalb hier das Zeichen. */}
      <img src="./icon.svg" alt="Dimension Solaire" className="size-7 md:hidden" />

      <button
        type="button"
        onClick={() => {
          setBefehlspalette(true)
        }}
        className="bg-surface-2 text-muted-foreground hover:border-border-strong focus-visible:ring-ring flex h-8 max-w-md min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors outline-none focus-visible:ring-2"
        aria-label={t('befehle.titel')}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">{t('nav.suchen')}</span>
        <Kbd className="hidden sm:inline-flex">{kuerzelText('k')}</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div
          role="group"
          aria-label={t('einstellungen.sprache')}
          className="hidden h-7 items-center rounded-md border p-0.5 text-xs font-semibold sm:flex"
        >
          {(['de', 'fr'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sprache === s}
              onClick={() => {
                setSprache(s)
              }}
              className="text-muted-foreground focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground h-full rounded px-2 outline-none focus-visible:ring-2"
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <Glocke />

        <Menue>
          <MenueAusloeser
            className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
            aria-label={t('konto.menue')}
          >
            <Avatar name={name} />
          </MenueAusloeser>
          <MenueInhalt align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {ich ? `${ich.rolle_name[sprache]} · ${ich.email ?? ''}` : t('konto.vorschauText')}
              </p>
            </div>
            <MenueTrenner />
            <MenueEintrag
              onSelect={() => {
                void navigate({ to: '/konto' })
              }}
            >
              <UserRound />
              {t('konto.meinKonto')}
            </MenueEintrag>
            <MenueTrenner />
            <MenueTitel>{t('einstellungen.darstellung')}</MenueTitel>
            <MenueRadioGruppe
              value={darstellung}
              onValueChange={(w) => {
                setDarstellung(w as Darstellung)
              }}
            >
              <MenueRadio value="hell">
                <Sun /> {t('einstellungen.hell')}
              </MenueRadio>
              <MenueRadio value="dunkel">
                <Moon /> {t('einstellungen.dunkel')}
              </MenueRadio>
              <MenueRadio value="system">
                <Monitor /> {t('einstellungen.system')}
              </MenueRadio>
            </MenueRadioGruppe>
            <MenueTrenner />
            <MenueTitel>{t('einstellungen.sprache')}</MenueTitel>
            {(['de', 'fr'] as const).map((s) => (
              <MenueEintrag
                key={s}
                onSelect={() => {
                  setSprache(s)
                }}
              >
                <Languages />
                <span className="flex-1">{s === 'de' ? 'Deutsch' : 'Français'}</span>
                {sprache === s && <Check className="!text-accent" />}
              </MenueEintrag>
            ))}
            {ich && (
              <>
                <MenueTrenner />
                <MenueEintrag onSelect={() => void abmelden()}>
                  <LogOut />
                  {t('anmeldung.abmelden')}
                </MenueEintrag>
              </>
            )}
          </MenueInhalt>
        </Menue>
      </div>
    </header>
  )
}
