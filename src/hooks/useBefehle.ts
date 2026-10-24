import { useNavigate } from '@tanstack/react-router'
import { Bell, House, Keyboard, LifeBuoy, UserPlus, Languages, Monitor, Moon, Palette, PanelLeft, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { SPRUENGE } from '@/lib/spruenge'
import { useKuerzel } from '@/stores/kuerzel'
import { useUi } from '@/stores/ui'

export interface Befehl {
  id: string
  titel: string
  /** Kurze Erklärung neben dem Titel (bei Bereichen der Untertitel). */
  untertitel?: string
  gruppe: 'kontakte' | 'gehe-zu' | 'aktionen'
  /** Icon als lucide-Komponente oder Modul-Icon-Name. */
  icon: LucideIcon | string
  /** Zusätzliche Suchbegriffe, z.B. der französische Titel, damit beide Sprachen gefunden werden. */
  stichworte: string[]
  /** Ctrl/Cmd-Kürzel, angezeigt als «Ctrl B». */
  kuerzel?: string
  /** Einfache Tasten ohne Ctrl, angezeigt wie geschrieben, z. B. «G K» oder «?». */
  tasten?: string
  ausfuehren: () => void
}

/** «G K» für Bereiche mit Sprung-Kürzel, sonst nichts. */
function sprungTasten(modul: string): { tasten?: string } {
  const s = SPRUENGE.find((x) => x.modul === modul)
  return s ? { tasten: `G ${s.taste.toUpperCase()}` } : {}
}

/**
 * Feste Befehle der Befehlspalette (Ctrl K): Bereiche und Aktionen. Kontakte kommen aus
 * `useKontaktBefehle`, Leads nach Nummer aus `useLeadBefehle`.
 */
export function useBefehle(onGewaehlt?: () => void): Befehl[] {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sprache, setSprache, setDarstellung, toggleSeitenleiste } = useUi()
  const sichtbar = useSichtbareModule()

  const fertig = (aktion: () => void) => () => {
    aktion()
    onGewaehlt?.()
  }
  const gehe = (pfad: string) =>
    fertig(() => {
      void navigate({ to: pfad })
    })

  const navigation: Befehl[] = [
    {
      id: 'start',
      titel: t('befehle.start'),
      gruppe: 'gehe-zu',
      icon: House,
      stichworte: ['home', 'accueil'],
      ausfuehren: gehe('/'),
    },
    ...sichtbar.map<Befehl>((m) => ({
      id: `modul-${m.id}`,
      titel: m.titel[sprache],
      untertitel: m.untertitel[sprache],
      gruppe: 'gehe-zu',
      icon: m.icon,
      stichworte: [m.titel.de, m.titel.fr, m.id],
      ...sprungTasten(m.id),
      ausfuehren: gehe(m.pfad),
    })),
    {
      id: 'design',
      titel: t('befehle.design'),
      gruppe: 'gehe-zu',
      icon: Palette,
      stichworte: ['design', 'bausteine', 'composants'],
      ausfuehren: gehe('/design'),
    },
  ]

  const verkauf = sichtbar.some((m) => m.id === 'sales')
  const aktionen: Befehl[] = [
    ...(verkauf
      ? [
          {
            id: 'neuer-lead',
            titel: t('befehle.neuerLead'),
            gruppe: 'aktionen',
            icon: UserPlus,
            stichworte: ['lead', 'anfrage', 'nouveau', 'demande'],
            ausfuehren: fertig(() => {
              void navigate({ to: '/sales', search: { neu: true } })
            }),
          } satisfies Befehl,
        ]
      : []),
    {
      id: 'sprache',
      titel: sprache === 'de' ? 'Passer en français' : 'Auf Deutsch wechseln',
      gruppe: 'aktionen',
      icon: Languages,
      stichworte: ['sprache', 'langue', 'deutsch', 'français'],
      ausfuehren: fertig(() => {
        setSprache(sprache === 'de' ? 'fr' : 'de')
      }),
    },
    {
      id: 'hell',
      titel: t('befehle.hell'),
      gruppe: 'aktionen',
      icon: Sun,
      stichworte: ['hell', 'clair', 'light'],
      ausfuehren: fertig(() => {
        setDarstellung('hell')
      }),
    },
    {
      id: 'dunkel',
      titel: t('befehle.dunkel'),
      gruppe: 'aktionen',
      icon: Moon,
      stichworte: ['dunkel', 'sombre', 'dark'],
      ausfuehren: fertig(() => {
        setDarstellung('dunkel')
      }),
    },
    {
      id: 'system',
      titel: t('befehle.system'),
      gruppe: 'aktionen',
      icon: Monitor,
      stichworte: ['system', 'système', 'auto'],
      ausfuehren: fertig(() => {
        setDarstellung('system')
      }),
    },
    {
      id: 'seitenleiste',
      titel: t('befehle.seitenleiste'),
      gruppe: 'aktionen',
      icon: PanelLeft,
      stichworte: ['navigation', 'menu'],
      kuerzel: 'B',
      ausfuehren: fertig(toggleSeitenleiste),
    },
    {
      id: 'benachrichtigungen',
      titel: t('befehle.benachrichtigungen'),
      gruppe: 'aktionen',
      icon: Bell,
      stichworte: ['notifications', 'glocke'],
      ausfuehren: gehe('/benachrichtigungen'),
    },
    {
      id: 'fehler-melden',
      titel: t('befehle.fehlerMelden'),
      gruppe: 'aktionen',
      icon: LifeBuoy,
      stichworte: ['bug', 'problème', 'signaler', 'helpdesk', 'meldung', 'support'],
      ausfuehren: fertig(() => {
        // Der Bereich, in dem man gerade ist, wird in der Meldung vorgewählt.
        const bereich = window.location.hash.replace(/^#\//, '').split(/[/?]/)[0] || 'anderes'
        void navigate({ to: '/knowledge', search: { ansicht: 'meldungen', neu: bereich } })
      }),
    },
    {
      id: 'kuerzel',
      titel: t('kuerzel.titel'),
      gruppe: 'aktionen',
      icon: Keyboard,
      stichworte: ['tastatur', 'clavier', 'raccourcis', 'shortcuts', 'hilfe'],
      tasten: '?',
      ausfuehren: fertig(() => {
        useKuerzel.getState().setHilfe(true)
      }),
    },
  ]

  return [...navigation, ...aktionen]
}
