import { useTranslation } from 'react-i18next'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'

/** Text einer Kategorie in der Sprache der Oberfläche; unbekannte (alte) Kategorien bleiben wie gespeichert. */
export function useKategorieText(): (k: string) => string {
  const { i18n } = useTranslation()
  const { spesen_kategorien } = useFinanzEinstellungen()
  return (k) => {
    const kat = spesen_kategorien.find((x) => x.schluessel === k)
    if (!kat) return k
    return i18n.language === 'fr' ? kat.fr : kat.de
  }
}
