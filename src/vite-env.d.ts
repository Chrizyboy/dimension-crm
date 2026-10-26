/// <reference types="vite/client" />

/** Programmversion aus package.json, beim Bauen eingesetzt. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** «github» nur in der veröffentlichten Desktop-App: automatische Updates sind eingeschaltet (Phase 16). */
  readonly VITE_AKTUALISIERUNG?: string
}
