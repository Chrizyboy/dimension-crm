import { meta as aftersales } from '@/modules/aftersales'
import { meta as ai } from '@/modules/ai'
import { meta as automations } from '@/modules/automations'
import { meta as contacts } from '@/modules/contacts'
import { meta as contracting } from '@/modules/contracting'
import { meta as contracts } from '@/modules/contracts'
import { meta as customers } from '@/modules/customers'
import { meta as dashboard } from '@/modules/dashboard'
import { meta as expenses } from '@/modules/expenses'
import { meta as fieldwork } from '@/modules/fieldwork'
import { meta as finance } from '@/modules/finance'
import { meta as fleet } from '@/modules/fleet'
import { meta as inbox } from '@/modules/inbox'
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
import { meta as staff } from '@/modules/staff'
import { meta as tasks } from '@/modules/tasks'
import { meta as tenders } from '@/modules/tenders'
import { meta as time } from '@/modules/time'
import { meta as today } from '@/modules/today'
import { meta as workcontracts } from '@/modules/workcontracts'
import type { ModulMeta, NavGruppe } from '@/types/modul'

/** Alle Module in der Reihenfolge der Seitenleiste. Einziger Ort, der alle Module kennt. */
export const MODULE: readonly ModulMeta[] = [
  // Übersicht
  today,
  tasks,
  inbox,
  outbox,
  dashboard,
  // Verkauf (wie V234)
  marketing,
  sales,
  tenders,
  contracting,
  quotes,
  pricing,
  customers,
  contacts,
  projects,
  fieldwork,
  purchasing,
  // Abwicklung (wie V234)
  workcontracts,
  contracts,
  invoices,
  expenses,
  finance,
  aftersales,
  // Team (besprochene Zusätze)
  time,
  fleet,
  staff,
  settings,
  automations,
  knowledge,
  ai,
]

/**
 * Reihenfolge der Gruppen in der Seitenleiste wie im alten CRM V234 (Chris 27.11.2026: «das alte crm war viel besser
 * und übersichtlicher»): Übersicht, Verkauf, Abwicklung, dazu «Team» mit den besprochenen Zusätzen. Handbuch und
 * Assistent («hilfe») haben keinen Eintrag; Einstellungen stehen unten in der Leiste.
 */
export const GRUPPEN: readonly NavGruppe[] = ['uebersicht', 'verkauf', 'abwicklung', 'betrieb', 'hilfe']

/** Hat der Bereich einen eigenen Eintrag in der Seitenleiste (nicht Teil eines sichtbaren Bereichs, nicht `ohneEintrag`)? */
export function hatEintrag(m: ModulMeta, sichtbar: readonly ModulMeta[]): boolean {
  return !m.ohneEintrag && !(m.teilVon && sichtbar.some((h) => h.id === m.teilVon))
}

/** Module einer Gruppe, in Seitenleisten-Reihenfolge. */
export function moduleDerGruppe(gruppe: NavGruppe): ModulMeta[] {
  return MODULE.filter((m) => m.gruppe === gruppe)
}

/**
 * Bereiche, die in der Seitenleiste einen Eintrag teilen (`teilVon`), mit dem Hauptbereich zuerst.
 * Nur die, die `sichtbar` enthält; leer, wenn der Bereich keine Teile hat.
 */
export function bereichsTeile(id: string, sichtbar: readonly ModulMeta[]): ModulMeta[] {
  const haupt = findeModul(id)?.teilVon ?? id
  const teile = sichtbar.filter((m) => m.id === haupt || m.teilVon === haupt)
  return teile.length > 1 ? teile : []
}

/** Findet ein Modul über seine id (z.B. aus der Adresse). */
export function findeModul(id: string): ModulMeta | undefined {
  return MODULE.find((m) => m.id === id)
}
