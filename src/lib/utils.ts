import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Verbindet CSS-Klassen und löst Tailwind-Konflikte auf (shadcn/ui-Konvention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
