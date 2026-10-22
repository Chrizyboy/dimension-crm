import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import {
  finanzEinstellungenSpeichern,
  useFinanzEinstellungen,
  type SpesenKategorie,
} from '@/hooks/useFinanzEinstellungen'
import { useAktion } from '../hooks/useAktion'

/**
 * Spesen-Kategorien und Mail-Adresse der Buchhaltung (V233 «Kategorien anpassbar»), nur mit Recht «finanzen».
 * Gespeichert wird der Schlüssel; eine umbenannte Kategorie behält ihn, damit alte Spesen ihren Text behalten.
 */
export function Kategorien() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const einstellungen = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const [liste, setListe] = useState<SpesenKategorie[]>(einstellungen.spesen_kategorien)
  const [mail, setMail] = useState(einstellungen.buchhaltung_email ?? '')

  const aendern = (i: number, feld: 'de' | 'fr', wert: string) => {
    setListe((l) => l.map((k, j) => (j === i ? { ...k, [feld]: wert } : k)))
  }

  async function speichern() {
    const sauber = liste
      .map((k) => ({ ...k, de: k.de.trim(), fr: k.fr.trim() || k.de.trim() }))
      .filter((k) => k.de)
      .map((k) => ({ ...k, schluessel: k.schluessel || k.de }))
    await aus(
      async () => {
        await finanzEinstellungenSpeichern({
          ...einstellungen,
          spesen_kategorien: sauber,
          buchhaltung_email: mail.trim() || null,
        })
        await qc.invalidateQueries({ queryKey: ['einstellungen', 'finanzen'] })
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
  }

  return (
    <div className="flex max-w-3xl flex-col">
      <AkteAbschnitt titel={t('spesen.kategorien.buchhaltung')}>
        <Feld
          id="spesen-buchhaltung-mail"
          label={t('spesen.kategorien.mail')}
          hinweis={t('spesen.kategorien.mailHinweis')}
        >
          <Input
            id="spesen-buchhaltung-mail"
            type="email"
            value={mail}
            onChange={(e) => {
              setMail(e.target.value)
            }}
          />
        </Feld>
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('spesen.kategorien.titel')} zusatz={String(liste.length)}>
        <ul className="flex flex-col gap-2">
          {liste.map((k, i) => (
            <li key={`${k.schluessel}-${String(i)}`} className="flex items-center gap-2">
              <Input
                aria-label={t('spesen.kategorien.de')}
                value={k.de}
                onChange={(e) => {
                  aendern(i, 'de', e.target.value)
                }}
              />
              <Input
                aria-label={t('spesen.kategorien.fr')}
                value={k.fr}
                onChange={(e) => {
                  aendern(i, 'fr', e.target.value)
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('spesen.kategorien.entfernen')}
                onClick={() => {
                  setListe((l) => l.filter((_, j) => j !== i))
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setListe((l) => [...l, { schluessel: '', de: '', fr: '' }])
            }}
          >
            <Plus />
            {t('spesen.kategorien.neu')}
          </Button>
          <Button laedt={laeuft} onClick={() => void speichern()}>
            {t('allgemein.speichern')}
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{t('spesen.kategorien.hinweis')}</p>
      </AkteAbschnitt>
    </div>
  )
}
