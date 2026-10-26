import { Printer } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useDrucken } from '@/hooks/useDrucken'
import { useUi } from '@/stores/ui'

interface Abschnitt {
  titel: string
  punkte: string[]
}

/**
 * Handbuch › Erste Schritte: die Schulungs-Kurzanleitung für den Start im Team (Installieren, Anmelden, Mein Tag,
 * wichtigste Abläufe, Hilfe). Der Text liegt in den Sprachdateien, damit DE und FR immer gleich aufgebaut sind;
 * «Drucken» gibt sie als eine A4-Seite aus, zum Verteilen oder als PDF.
 */
export function ErsteSchritte() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const druck = useDrucken()
  const abschnitte = t('handbuch.start.abschnitte', { returnObjects: true }) as Abschnitt[]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.start.intro')}</p>
        <Button variant="secondary" onClick={druck.drucke}>
          <Printer />
          {t('handbuch.start.drucken')}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {abschnitte.map((a) => (
          <Karte key={a.titel}>
            <KarteKopf>
              <KarteTitel>{a.titel}</KarteTitel>
            </KarteKopf>
            <KarteInhalt>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                {a.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </KarteInhalt>
          </Karte>
        ))}
      </div>
      {druck.aktiv && <Druck titel={t('handbuch.start.druckTitel')} abschnitte={abschnitte} sprache={sprache} />}
    </div>
  )
}

/** Druckfassung: Logo, Titel, Abschnitte. Papier ist weiss, darum feste Farben. */
function Druck({ titel, abschnitte, sprache }: { titel: string; abschnitte: Abschnitt[]; sprache: 'de' | 'fr' }) {
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#10263f' }}>
      <img src={`./logo/logo-hell-${sprache}.png`} alt="Dimension Solaire" style={{ height: 40 }} />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '10px 0 18px' }} />
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{titel}</h1>
      {abschnitte.map((a) => (
        <section key={a.titel} style={{ breakInside: 'avoid', marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.titel}</h2>
          <ul style={{ paddingLeft: 18, lineHeight: 1.5, listStyle: 'disc' }}>
            {a.punkte.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>,
    document.body,
  )
}
