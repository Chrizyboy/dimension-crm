import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Knopf-Varianten. Faustregel: pro Ansicht höchstens EIN «primary» (die Hauptaktion),
 * «accent» nur für Abschlüsse wie «Offerte senden», «danger» nur für Papierkorb/Stornieren.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Hauptaktion orange mit Verlauf wie V234; dunkle Schrift, damit der Kontrast über 6:1 bleibt.
        primary:
          'bg-[image:var(--akzent-verlauf)] text-[#120a00] font-semibold shadow-[var(--akzent-schatten)] hover:brightness-105',
        accent:
          'bg-[image:var(--akzent-verlauf)] text-[#120a00] font-semibold shadow-[var(--akzent-schatten)] hover:brightness-105',
        secondary:
          'border border-[var(--glas-rand)] bg-[var(--glas-feld)] text-foreground shadow-[var(--glas-schatten-klein)] hover:bg-[var(--glas-wahl)]',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        danger: 'bg-bad text-white hover:brightness-110 dark:text-[#1a0806]',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline dark:text-accent',
        glas: 'glas !shadow-[var(--glas-schatten-klein)] text-foreground hover:bg-[var(--glas-wahl)]',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-10 px-4 text-sm',
        icon: 'size-8',
        // Runde Glas-Knöpfe oben rechts (V234): Glocke, Vollbild, Aktualisieren, Hilfe.
        rund: 'size-10 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Zeigt einen Lade-Kreisel und sperrt den Knopf, z.B. während gespeichert wird. */
    laedt?: boolean
  }

/** Standard-Knopf des CRM. */
export function Button({
  className,
  variant,
  size,
  laedt = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled === true || laedt}
      aria-busy={laedt || undefined}
      {...props}
    >
      {laedt && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
