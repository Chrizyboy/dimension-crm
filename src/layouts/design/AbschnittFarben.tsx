import { useTranslation } from 'react-i18next'
import { Abschnitt } from './Abschnitt'

interface Farbe {
  token: string
  klasse: string
  /** Textfarbe, die auf dieser Fläche lesbar ist. */
  schrift: string
}

const GRUPPEN: { schluessel: string; farben: Farbe[] }[] = [
  {
    schluessel: 'marke',
    farben: [
      { token: 'sun', klasse: 'bg-sun', schrift: 'text-[#1d1300]' },
      { token: 'navy', klasse: 'bg-navy', schrift: 'text-white' },
      { token: 'primary', klasse: 'bg-primary', schrift: 'text-primary-foreground' },
      { token: 'accent-soft', klasse: 'bg-accent-soft', schrift: 'text-accent-ink' },
    ],
  },
  {
    schluessel: 'flaechen',
    farben: [
      { token: 'background', klasse: 'bg-background', schrift: 'text-foreground' },
      { token: 'surface', klasse: 'bg-surface', schrift: 'text-foreground' },
      { token: 'muted', klasse: 'bg-muted', schrift: 'text-muted-foreground' },
      { token: 'sidebar', klasse: 'bg-sidebar', schrift: 'text-sidebar-foreground' },
    ],
  },
  {
    schluessel: 'zustaende',
    farben: [
      { token: 'ok', klasse: 'bg-ok-soft', schrift: 'text-ok' },
      { token: 'warn', klasse: 'bg-warn-soft', schrift: 'text-warn' },
      { token: 'bad', klasse: 'bg-bad-soft', schrift: 'text-bad' },
      { token: 'info', klasse: 'bg-info-soft', schrift: 'text-info' },
    ],
  },
]

/** Farbpalette mit Token-Namen, so wie sie im Code heissen (bg-…, text-…). */
export function AbschnittFarben() {
  const { t } = useTranslation()
  return (
    <Abschnitt id="farben" titel={t('design.farben')} text={t('design.farbenText')}>
      <div className="grid gap-5 lg:grid-cols-3">
        {GRUPPEN.map((g) => (
          <div key={g.schluessel} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t(`design.farbgruppe.${g.schluessel}`)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {g.farben.map((f) => (
                <div
                  key={f.token}
                  className={`flex h-16 flex-col justify-end rounded-lg border p-2.5 ${f.klasse} ${f.schrift}`}
                >
                  <span className="font-mono text-[11px] font-medium">{f.token}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Abschnitt>
  )
}
