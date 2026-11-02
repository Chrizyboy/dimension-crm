import { FileText, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { dokumentAdresse } from '@/services/dokumente'
import { supabase } from '@/services/supabase'
import type { AusgangAenderung } from '../schema'
import type { AusgangEintrag } from '../types'

/** HTML einer Mail als reiner Text (nie als HTML anzeigen: fremde Inhalte sind Daten). */
export function alsText(html: string): string {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html')
  return d.body.textContent.trim()
}

/** Anhang in neuem Fenster öffnen (SharePoint oder kurzlebiger Link auf den Speicher). */
async function anhangOeffnen(id: string) {
  try {
    if (!supabase) return
    const { data } = await supabase.from('dokumente').select('sharepoint_url, speicher_pfad').eq('id', id).single()
    const url = data ? await dokumentAdresse(data) : null
    if (url) window.open(url, '_blank', 'noopener')
  } catch (e) {
    meldeFehler(e, 'ausgang')
  }
}

/**
 * Inhalt eines Eintrags: so wie ihn der Kunde bekommt (Kopf mit Von/An, Text auf «Papier»), oder als Formular, wenn
 * man ändert. Die Signatur ist Teil des Textes; Outlook hängt keine eigene an.
 */
export function MailInhalt({
  e,
  w,
  bearbeiten,
  fehler,
  onAenderung,
}: {
  e: AusgangEintrag
  w: AusgangAenderung
  bearbeiten: boolean
  fehler: Partial<Record<keyof AusgangAenderung, string>>
  onAenderung: (w: AusgangAenderung) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {bearbeiten ? (
        <div className="flex flex-col gap-3">
          <Feld id="ausgang-an" label={e.kanal === 'brief' ? t('ausgang.postadresse') : t('ausgang.an')} fehler={fehler.an} pflicht>
            {e.kanal === 'brief' ? (
              <Textarea id="ausgang-an" rows={4} value={w.an} onChange={(x) => { onAenderung({ ...w, an: x.target.value }) }} />
            ) : (
              <Input id="ausgang-an" value={w.an} onChange={(x) => { onAenderung({ ...w, an: x.target.value }) }} />
            )}
          </Feld>
          {e.kanal === 'mail' && (
            <Feld id="ausgang-cc" label={t('ausgang.cc')}>
              <Input id="ausgang-cc" value={w.cc} onChange={(x) => { onAenderung({ ...w, cc: x.target.value }) }} />
            </Feld>
          )}
          {e.kanal !== 'sms' && (
            <Feld id="ausgang-betreff" label={t('ausgang.betreff')} fehler={fehler.betreff} pflicht>
              <Input id="ausgang-betreff" value={w.betreff} onChange={(x) => { onAenderung({ ...w, betreff: x.target.value }) }} />
            </Feld>
          )}
          <Feld id="ausgang-text" label={t('ausgang.text')} fehler={fehler.text} pflicht={e.kanal !== 'brief'}>
            <Textarea
              id="ausgang-text"
              rows={e.kanal === 'sms' ? 4 : 14}
              value={w.text}
              onChange={(x) => {
                onAenderung({ ...w, text: x.target.value })
              }}
            />
          </Feld>
          {e.kanal === 'sms' && (
            <p className="text-muted-foreground text-xs">
              {t('ausgang.zeichen', { count: w.text.length })} · {t('ausgang.smsTeile', { count: Math.max(1, Math.ceil(w.text.length / 153)) })}
            </p>
          )}
          {e.ki_status === 'fertig' && e.ki_auftrag?.vorlage_text && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">{t('ki.ausgang.vorlageZeigen')}</summary>
              <p className="bg-muted/60 mt-2 rounded-md p-3 whitespace-pre-wrap">{e.ki_auftrag.vorlage_text}</p>
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => { onAenderung({ ...w, text: e.ki_auftrag?.vorlage_text ?? w.text }) }}>
                {t('ki.ausgang.vorlageNehmen')}
              </Button>
            </details>
          )}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
            {e.kanal === 'mail' && (
              <>
                <dt className="text-muted-foreground">{t('ausgang.vonFeld')}</dt>
                <dd className="break-words">{e.absender ?? t('ausgang.system')}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{e.kanal === 'brief' ? t('ausgang.postadresse') : t('ausgang.an')}</dt>
            <dd className="break-words whitespace-pre-line">{w.an}</dd>
            {w.cc && (
              <>
                <dt className="text-muted-foreground">{t('ausgang.cc')}</dt>
                <dd className="break-words">{w.cc}</dd>
              </>
            )}
            {e.kanal !== 'sms' && (
              <>
                <dt className="text-muted-foreground">{t('ausgang.betreff')}</dt>
                <dd className="font-medium break-words">{w.betreff}</dd>
              </>
            )}
          </dl>
          {w.text && (
            <div
              aria-label={t('ausgang.soSiehtEsAus')}
              className={
                e.kanal === 'sms'
                  ? 'bg-info-soft max-w-sm self-start rounded-2xl rounded-bl-sm px-4 py-3 text-sm whitespace-pre-wrap'
                  : 'bg-surface rounded-lg border px-5 py-4 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs'
              }
            >
              {w.text}
            </div>
          )}
          {e.ki_status === 'wartet' && <p className="text-muted-foreground text-xs">{t('ki.ausgang.wartetHinweis')}</p>}
        </>
      )}
      {e.anhaenge.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('ausgang.anhaenge')}>
          {e.anhaenge.map((a) => (
            <li key={a.dokument_id}>
              <Button size="sm" variant="secondary" onClick={() => void anhangOeffnen(a.dokument_id)}>
                {e.kanal === 'brief' ? <FileText /> : <Paperclip />}
                {a.name ?? t('ausgang.anhang')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
