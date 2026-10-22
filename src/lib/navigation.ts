import { meta as aftersales } from '@/modules/aftersales'
import { meta as ai } from '@/modules/ai'
import { meta as automations } from '@/modules/automations'
import { meta as contacts } from '@/modules/contacts'
import { meta as contracts } from '@/modules/contracts'
import { meta as customers } from '@/modules/customers'
import { meta as dashboard } from '@/modules/dashboard'
import { meta as expenses } from '@/modules/expenses'
import { meta as fieldwork } from '@/modules/fieldwork'
import { meta as finance } from '@/modules/finance'
import { meta as invoices } from '@/modules/invoices'
import { meta as knowledge } from '@/modules/knowledge'
import { meta as marketing } from '@/modules/marketing'
import { meta as outbox } from '@/modules/outbox'
import { meta as pricing } from '@/modules/pricing'
import { meta as projects } from '@/modules/projects'
import { meta as purchasing } from '@/modules/purchasing'
import { meta as quotes } from '@/modules/quotes'
import { meta as sales } from '@/modules/sales'
import { meta as settings } from '@/modules/settings'
import { meta as tasks } from '@/modules/tasks'
import { meta as tenders } from '@/modules/tenders'
import { meta as today } from '@/modules/today'
import { meta as workcontracts } from '@/modules/workcontracts'
import type { ModulMeta, NavGruppe } from '@/types/modul'

/** Alle Module in der Reihenfolge der Seitenleiste. Einziger Ort, der alle Module kennt. */
export const MODULE: readonly ModulMeta[] = [
  today,
  dashboard,
  tasks,
  outbox,
  sales,
  quotes,
  pricing,
  workcontracts,
  tenders,
  customers,
  contacts,
  marketing,
  projects,
  purchasing,
  fieldwork,
  contracts,
  invoices,
  aftersales,
  finance,
  expenses,
  automations,
  settings,
  knowledge,
  ai,
]

/** Reihenfolge der Gruppen in der Seitenleiste. */
export const GRUPPEN: readonly NavGruppe[] = ['uebersicht', 'verkauf', 'abwicklung', 'verwaltung', 'weitere']

/** Module einer Gruppe, in Seitenleisten-Reihenfolge. */
export function moduleDerGruppe(gruppe: NavGruppe): ModulMeta[] {
  return MODULE.filter((m) => m.gruppe === gruppe)
}

/** Findet ein Modul über seine id (z.B. aus der Adresse). */
export function findeModul(id: string): ModulMeta | undefined {
  return MODULE.find((m) => m.id === id)
}
