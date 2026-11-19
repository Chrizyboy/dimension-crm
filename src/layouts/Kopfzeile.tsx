import { useNavigate } from '@tanstack/react-router'
import { Check, Languages, LogOut, Monitor, Moon, Search, Sparkles, Sun, Trash2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Kbd } from '@/components/ui/diverses'
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
import { Logo, SIGNET } from '@/components/shared/Logo'
import { kurzzeichenVon } from '@/lib/kurzzeichen'
import { darfModul } from '@/lib/rechte'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { meta as assistentMeta } from '@/modules/ai'
import { abmelden } from '@/services/anmeldung'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi, type Darstellung } from '@/stores/ui'
import { UpdateKnopf } from './Aktualisierung'
import { Glocke } from './Benachrichtigungen'
import { FensterKnoepfe } from './FensterKnoepfe'
import { HilfeKnopf } from './HilfeKnopf'

/** Obere Leiste: Suche/Befehlspalette, Assistent (Ctrl J), Sprache, Benachrichtigungen, Konto-Menü. */
export function Kopfzeile() {
  const { t } = useTranslation()
  const { sprache, darstellung, setSprache, setDarstellung, setBefehlspalette, setAssistent } = useUi()
  const ich = useAnmeldung((z) => z.ich)
  const navigate = useNavigate()
  const name = ich?.name ?? t('konto.vorschau')
  // Einfache Ansicht (Monteure): keine Seitenleiste und keine Suche, das Logo steht immer hier.
  const einfach = ich?.ansicht === 'einfach'

  return (
    // Ohne eigene Fläche: Suche und runde Glas-Knöpfe stehen direkt auf dem Farbverlauf (V234).
    <header className="flex h-14 shrink-0 items-center gap-2 px-3 pt-2 sm:px-6 md:h-[72px] md:pt-3.5">
      {/* Am Handy fehlt die Seitenleiste mit dem Logo, deshalb hier das Zeichen. */}
      {einfach ? <Logo kurz className="h-7" /> : <img src={SIGNET} alt="Dimension Work" className="size-7 md:hidden" />}

      {!einfach && (
        <button
          type="button"
          onClick={() => {
            setBefehlspalette(true)
          }}
          aria-label={t('nav.suchen')}
          // Am Handy nur die Lupe (rund wie die anderen Knöpfe), sonst bliebe vom Text nur «S.».
          className="glas text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-10 w-10 max-w-md min-w-0 flex-none items-center justify-center gap-2 rounded-full text-sm !shadow-[var(--glas-schatten-klein)] transition-colors outline-none focus-visible:ring-2 sm:w-auto sm:flex-1 sm:justify-start sm:px-4"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden flex-1 truncate text-left sm:block">{t('nav.suchen')}</span>
          <Kbd className="hidden sm:inline-flex">{kuerzelText('k')}</Kbd>
        </button>
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {!einfach && ich && darfModul(assistentMeta, ich) && (
          <button
            type="button"
            onClick={() => {
              setAssistent(true)
            }}
            title={`${t('nav.assistent')} (${kuerzelText('j')})`}
            className="glas text-foreground focus-visible:ring-ring flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold !shadow-[var(--glas-schatten-klein)] outline-none hover:bg-[var(--glas-wahl)] focus-visible:ring-2"
          >
            <Sparkles className="text-accent size-4" aria-hidden="true" />
            <span className="hidden lg:inline">{t('nav.assistent')}</span>
          </button>
        )}
        <div
          role="group"
          aria-label={t('einstellungen.sprache')}
          className="glas hidden h-10 items-center rounded-full p-1 text-xs font-semibold !shadow-[var(--glas-schatten-klein)] sm:flex"
        >
          {(['de', 'fr'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sprache === s}
              onClick={() => {
                setSprache(s)
              }}
              className="text-muted-foreground focus-visible:ring-ring aria-pressed:text-foreground h-full rounded-full px-2.5 outline-none focus-visible:ring-2 aria-pressed:bg-[var(--glas-wahl)] aria-pressed:shadow-[0_1px_2px_rgb(11_27_46/0.1)]"
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <UpdateKnopf />
        <HilfeKnopf />
        <FensterKnoepfe />
        <Glocke />

        <Menue>
          <MenueAusloeser
            className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
            aria-label={t('konto.menue')}
          >
            {/* Orange Kreis mit Kurzzeichen wie V234. */}
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-[image:var(--akzent-verlauf)] text-[13px] font-bold text-[#120a00] shadow-[var(--glas-schatten)]"
            >
              {kurzzeichenVon({ name })}
            </span>
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
            <MenueEintrag
              onSelect={() => {
                void navigate({ to: '/papierkorb' })
              }}
            >
              <Trash2 />
              {t('papierkorb.titel')}
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
