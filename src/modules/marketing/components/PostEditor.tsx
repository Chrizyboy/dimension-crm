import { CheckCheck, ExternalLink, Rocket, Save, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useVorlagen } from '../hooks/useMarketing'
import {
  erledigt,
  freigeben,
  jetztVeroeffentlichen,
  postPapierkorb,
  speicherePost,
  zurueckziehen,
} from '../services/social'
import { postFehlerSchluessel } from '../lib/texte'
import { NETZWERKE, type Netzwerk, type PostSprache, type SocialPost } from '../types'
import { PostBild } from './PostBild'
import { PostQuelle } from './PostQuelle'
import { PostTexte } from './PostTexte'

const NEU: Omit<SocialPost, 'id' | 'erstellt_am'> = {
  thema: '',
  idee: '',
  netzwerke: ['instagram', 'linkedin'],
  format: 'quadrat',
  sprache: 'de_fr',
  texte: {},
  bilder: [],
  status: 'entwurf',
  geplant_am: null,
  veroeffentlicht_am: null,
  ergebnis: {},
  details: { quelle: 'eigen' },
  verfasst_von: null,
}

/** Zeitpunkt in Zürich als Werte für Datum- und Zeit-Feld. */
function lokal(iso: string | null): { datum: string; zeit: string } {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86_400_000)
  const s = d.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  return { datum: s.slice(0, 10), zeit: iso ? s.slice(11, 16) : '09:00' }
}

/**
 * Ein Post von der Idee bis zur Veröffentlichung: Thema, Quelle, Netzwerke, Sprache, Texte je Netzwerk, Bild
 * (Foto oder Canva), dann «Freigeben und planen» oder «Jetzt veröffentlichen» (Regel 6: der Klick ist die
 * Freigabe). Geplante lassen sich zurückziehen; nach dem Posten zeigt er die Links.
 */
export function PostEditor({ post, onSchliessen }: { post: SocialPost | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const sprache = useUi((z) => z.sprache)
  const vorlagen = useVorlagen()
  const { laeuft, aus } = useAktion()
  const [p, setP] = useState<Omit<SocialPost, 'erstellt_am' | 'id'> & { id?: string }>(
    post ?? { ...NEU, verfasst_von: ich?.kuerzel ?? null },
  )
  const [plan, setPlan] = useState(lokal(post?.geplant_am ?? null))
  const fest = !['entwurf', 'fehler'].includes(p.status)
  const aendern = (a: Partial<SocialPost>) => {
    setP((x) => ({ ...x, ...a }))
  }

  async function sichern(): Promise<string | undefined> {
    const id = await aus(() => speicherePost(p))
    if (id) setP((x) => ({ ...x, id }))
    return id
  }
  async function planen(sofort: boolean) {
    const id = await sichern()
    if (!id) return
    const zeit = sofort ? null : new Date(`${plan.datum}T${plan.zeit}:00`).toISOString()
    const ok = await aus(() => freigeben(id, zeit).then(() => true))
    if (!ok) return
    if (sofort) await aus(() => jetztVeroeffentlichen(id), { de: 'Veröffentlicht', fr: 'Publié' })
    else melde('ok', { de: 'Freigegeben und geplant', fr: 'Validé et planifié' })
    onSchliessen()
  }
  const status = async (f: (id: string) => Promise<unknown>, text: { de: string; fr: string }) => {
    const id = p.id
    if (id && (await aus(() => f(id).then(() => true), text))) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[42rem]"
        titel={p.id ? t('marketing.post.bearbeiten') : t('marketing.post.neu')}
        beschreibung={t(`marketing.post.status.${p.status}`)}
        fuss={
          <div className="flex w-full flex-wrap justify-end gap-2">
            {p.id && p.status === 'entwurf' && (
              <Button
                variant="ghost"
                disabled={laeuft}
                onClick={() => void status(postPapierkorb, { de: 'Im Papierkorb', fr: 'Dans la corbeille' })}
              >
                <Trash2 />
                {t('marketing.post.papierkorb')}
              </Button>
            )}
            {p.id && ['entwurf', 'fehler'].includes(p.status) && (
              <Button
                variant="ghost"
                disabled={laeuft}
                onClick={() => void status(erledigt, { de: 'Abgelegt', fr: 'Classé' })}
              >
                <CheckCheck />
                {t('marketing.post.erledigt')}
              </Button>
            )}
            {['geplant', 'fehler'].includes(p.status) && (
              <Button
                variant="secondary"
                disabled={laeuft}
                onClick={() => void status(zurueckziehen, { de: 'Zurückgezogen', fr: 'Retiré' })}
              >
                <Undo2 />
                {t('marketing.post.zurueckziehen')}
              </Button>
            )}
            {!fest && (
              <>
                <Button
                  variant="secondary"
                  disabled={laeuft}
                  onClick={() =>
                    void sichern().then((id) => {
                      if (id) onSchliessen()
                    })
                  }
                >
                  <Save />
                  {t('marketing.post.speichern')}
                </Button>
                <Button variant="secondary" disabled={laeuft} onClick={() => void planen(true)}>
                  <Rocket />
                  {t('marketing.post.jetzt')}
                </Button>
                <Button laedt={laeuft} onClick={() => void planen(false)}>
                  {t('marketing.post.planen')}
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {Object.entries(p.ergebnis).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(p.ergebnis).map(([n, e]) => (
                <li key={n}>
                  {e.ok && e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 text-sm underline"
                    >
                      {t(`marketing.netzwerk.${n}`)} <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <span className={`text-sm ${e.ok ? 'text-ok' : 'text-bad'}`}>
                      {t(`marketing.netzwerk.${n}`)}:{' '}
                      {e.ok
                        ? t('marketing.post.status.veroeffentlicht')
                        : t(postFehlerSchluessel(e.fehler), { code: e.fehler ?? '' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="post-thema" label={t('marketing.post.thema')}>
              <Input
                id="post-thema"
                list="post-themen"
                readOnly={fest}
                value={p.thema ?? ''}
                onChange={(e) => {
                  aendern({ thema: e.target.value })
                }}
              />
              <datalist id="post-themen">
                {(vorlagen.data?.social.themen ?? []).map((th) => (
                  <option key={th} value={th} />
                ))}
              </datalist>
            </Feld>
            <Feld id="post-sprache" label={t('marketing.post.sprache')}>
              <Auswahl
                id="post-sprache"
                value={p.sprache ?? 'de'}
                disabled={fest}
                onValueChange={(s) => {
                  aendern({ sprache: s as PostSprache })
                }}
                optionen={(['de', 'fr', 'de_fr'] as const).map((s) => ({
                  wert: s,
                  text: t(`marketing.post.spracheWert.${s}`),
                }))}
              />
            </Feld>
          </div>
          <PostQuelle
            details={p.details}
            fest={fest}
            sprache={sprache}
            onWahl={(details, idee) => {
              aendern({ details, ...(idee ? { idee } : {}) })
            }}
          />
          <Feld id="post-idee" label={t('marketing.post.idee')}>
            <Textarea
              id="post-idee"
              rows={2}
              readOnly={fest}
              value={p.idee ?? ''}
              onChange={(e) => {
                aendern({ idee: e.target.value })
              }}
            />
          </Feld>
          <Filterchips
            beschriftung={t('marketing.post.netzwerke')}
            optionen={NETZWERKE.map((n) => ({ wert: n, text: t(`marketing.netzwerk.${n}`) }))}
            gewaehlt={p.netzwerke}
            onChange={(n) => {
              if (!fest) aendern({ netzwerke: n as Netzwerk[] })
            }}
          />
          <PostBild
            post={p}
            fest={fest}
            braucheId={() => (p.id ? Promise.resolve(p.id) : sichern())}
            onAenderung={aendern}
          />
          <PostTexte
            post={p}
            regeln={vorlagen.data?.social.regeln ?? {}}
            fest={fest}
            onTexte={(texte) => {
              aendern({ texte })
            }}
          />
          {!fest && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld id="post-datum" label={t('marketing.post.datum')}>
                <Input
                  id="post-datum"
                  type="date"
                  value={plan.datum}
                  onChange={(e) => {
                    setPlan({ ...plan, datum: e.target.value })
                  }}
                />
              </Feld>
              <Feld id="post-zeit" label={t('marketing.post.zeit')}>
                <Input
                  id="post-zeit"
                  type="time"
                  value={plan.zeit}
                  onChange={(e) => {
                    setPlan({ ...plan, zeit: e.target.value })
                  }}
                />
              </Feld>
            </div>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
