import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail } from 'lucide-react'
import { useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import {
  anmeldenMitMicrosoft,
  microsoftVerfuegbar,
  pruefeAnmeldecode,
  sendeAnmeldecode,
  type Anmeldefehler,
} from '@/services/anmeldung'
import { useUi } from '@/stores/ui'

/** Microsoft-Logo aus vier Quadraten (offizielle Farben), damit der Knopf sofort erkannt wird. */
function MicrosoftZeichen() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

/**
 * Anmeldung: Standard ist das Microsoft-Firmenkonto, sonst ein Code per E-Mail.
 * Ein Konto entsteht nur für Personen, die die Administration im CRM erfasst hat.
 */
export function Anmeldeseite() {
  const { t } = useTranslation()
  const { sprache, setSprache } = useUi()
  const microsoft = useQuery({ queryKey: ['microsoft-verfuegbar'], queryFn: microsoftVerfuegbar, staleTime: Infinity })
  const [schritt, setSchritt] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fehler, setFehler] = useState<Anmeldefehler | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function weiter(e: SyntheticEvent) {
    e.preventDefault()
    setLaeuft(true)
    setFehler(null)
    const f = schritt === 'email' ? await sendeAnmeldecode(email, sprache) : await pruefeAnmeldecode(email, code)
    setLaeuft(false)
    setFehler(f)
    if (!f && schritt === 'email') setSchritt('code')
  }

  return (
    <div className="bg-background flex min-h-full items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo className="h-10 sm:h-12" />
          <div
            role="group"
            aria-label={t('einstellungen.sprache')}
            className="flex h-7 rounded-md border p-0.5 text-xs font-semibold"
          >
            {(['de', 'fr'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sprache === s}
                onClick={() => {
                  setSprache(s)
                }}
                className="text-muted-foreground focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded px-2 outline-none focus-visible:ring-2"
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <Karte className="shadow-pop flex flex-col gap-5 rounded-xl p-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl font-semibold">{t('anmeldung.titel')}</h1>
            <p className="text-muted-foreground text-sm">{t('anmeldung.text')}</p>
          </div>

          {microsoft.data && schritt === 'email' && (
            <>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  void anmeldenMitMicrosoft().then(setFehler)
                }}
              >
                <MicrosoftZeichen />
                {t('anmeldung.microsoft')}
              </Button>
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                {t('anmeldung.oder')}
                <span className="bg-border h-px flex-1" />
              </div>
            </>
          )}

          <form onSubmit={(e) => void weiter(e)} className="flex flex-col gap-4" noValidate>
            {schritt === 'email' ? (
              <Feld id="anmeldung-email" label={t('anmeldung.email')} hinweis={t('anmeldung.emailHinweis')}>
                <Input
                  id="anmeldung-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                  }}
                  placeholder="vorname.name@dimension-solaire.ch"
                />
              </Feld>
            ) : (
              <Feld id="anmeldung-code" label={t('anmeldung.code')} hinweis={t('anmeldung.codeHinweis', { email })}>
                <Input
                  id="anmeldung-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''))
                  }}
                  className="zahlen text-center text-lg tracking-[0.4em]"
                />
              </Feld>
            )}

            {fehler && (
              <p role="alert" className="text-bad text-sm">
                {t(`anmeldung.fehler.${fehler}`)}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              laedt={laeuft}
              disabled={laeuft || (schritt === 'email' ? !email.includes('@') : code.length !== 6)}
            >
              {schritt === 'email' && <Mail />}
              {schritt === 'email' ? t('anmeldung.codeSenden') : t('anmeldung.anmelden')}
            </Button>

            {schritt === 'code' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSchritt('email')
                  setCode('')
                  setFehler(null)
                }}
              >
                <ArrowLeft />
                {t('anmeldung.andereAdresse')}
              </Button>
            )}
          </form>
        </Karte>

        <p className="text-muted-foreground text-center text-xs">{t('anmeldung.fuss')}</p>
      </div>
    </div>
  )
}
