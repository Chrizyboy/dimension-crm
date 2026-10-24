import { z } from 'zod'

/** Kosten pro Lead einer Quelle: Franken, leer = keine Kosten, höchstens CHF 100'000. */
export const quellenKostenSchema = z.number().int().min(0).max(10_000_000).nullable()
