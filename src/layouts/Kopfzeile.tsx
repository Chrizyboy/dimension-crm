import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  CircleHelp,
  Languages,
  LogOut,
  Maximize,
  Minimize,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Suspense } from 'react'
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
import { AusgangKnopf, meta as ausgangMeta } from '@/modules/outbox'
import { abmelden } from '@/services/anmeldung'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi, type Darstellung } from '@/stores/ui'
import { UpdateKnopf } from './Aktualisierung'
import { Glocke } from './Benachrichtigungen'
import { useAnsicht } from './AnsichtKnopf'
import { useFenster } from './FensterKnoepfe'
import { useHilfe } from './HilfeKnopf'

/**
 * Obere Leiste: Suche/Befehlspalette, Assistent (Ctrl J), Benachrichtigungen, Konto-Menü. Sprache, Hilfe (F1),
 * PC/Handy, Vollbild (F11) und Aktualisieren stehen seit 27.11.2026 im Konto-Menü (Chris: so wenig wie möglich oben).
 */
export function Kopfzeile() {
  const { t } = useTranslation()
  const { sprache, darstellung, setSprache, setDarstellung, setBefehlspalette, setAssistent } = useUi()
  const ich = useAnmeldung((z) => z.ich)
  const navigate = useNavigate()
  const name = ich?.name ?? t('konto.vorschau')
  // Einfache Ansicht (Monteure): keine Seitenleiste und keine Suche, das Logo steht immer hier.
  const einfach = ich?.ansicht === 'einfach'
  const hilfe = useHilfe()
  const fenster = useFenster()
  const ansicht = useAnsicht()

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
        <UpdateKnopf />
        {!einfach && ich && darfModul(ausgangMeta, ich) && (
          <Suspense fallback={null}>
            <AusgangKnopf />
          </Suspense>
        )}
        <Glocke />
        {hilfe.panel}

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
            <MenueEintrag onSelect={hilfe.oeffnen}>
              <CircleHelp />
              {t('handbuch.hilfe.knopf')}
            </MenueEintrag>
            <MenueTrenner />
            <MenueEintrag onSelect={fenster.aktualisieren}>
              <RefreshCw className={fenster.laedt ? 'animate-spin' : undefined} />
              {t('fenster.aktualisieren')}
            </MenueEintrag>
            <MenueEintrag onSelect={fenster.vollbildUmschalten}>
              {fenster.vollbild ? <Minimize /> : <Maximize />}
              <span className="flex-1">{fenster.vollbildText}</span>
              <span className="text-muted-foreground text-xs">F11</span>
            </MenueEintrag>
            <MenueEintrag onSelect={ansicht.umschalten}>
              {ansicht.zeigtHandy ? <Monitor /> : <Smartphone />}
              {ansicht.text}
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
