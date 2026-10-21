import { MoreHorizontal, Pencil, Trash2, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { Abschnitt } from './Abschnitt'

type Status = 'versendet' | 'inVerhandlung' | 'angenommen' | 'ueberfaellig'
const TON: Record<Status, BadgeProps['ton']> = {
  versendet: 'info',
  inVerhandlung: 'marke',
  angenommen: 'ok',
  ueberfaellig: 'kritisch',
}

/** Beispieldaten (erfunden), nur zur Darstellung. Echte Offerten kommen mit Phase 7. */
const OFFERTEN: {
  nr: string
  kunde: string
  ort: string
  kwp: number
  rappen: number
  datum: string
  status: Status
  zustaendig: string
}[] = [
  {
    nr: 'OF-2026-0412',
    kunde: 'Familie Gerber',
    ort: 'Muri AG',
    kwp: 9.8,
    rappen: 2_345_000,
    datum: '2026-10-14',
    status: 'inVerhandlung',
    zustaendig: 'Andreas Meyer',
  },
  {
    nr: 'OF-2026-0409',
    kunde: 'Boulangerie Dubois Sàrl',
    ort: 'Bulle',
    kwp: 32.4,
    rappen: 6_180_050,
    datum: '2026-10-09',
    status: 'versendet',
    zustaendig: 'Chris Rosenberg',
  },
  {
    nr: 'OF-2026-0401',
    kunde: 'Bauernhof Huber',
    ort: 'Boswil',
    kwp: 54,
    rappen: 8_975_000,
    datum: '2026-09-28',
    status: 'angenommen',
    zustaendig: 'Andreas Meyer',
  },
  {
    nr: 'OF-2026-0388',
    kunde: 'Résidence Les Prés',
    ort: 'Châtel-St-Denis',
    kwp: 18.2,
    rappen: 3_910_500,
    datum: '2026-09-12',
    status: 'ueberfaellig',
    zustaendig: 'Chris Rosenberg',
  },
]

/** Tabellen, Karten und Reiter mit realistischen Beispielen aus dem Solar-Alltag. */
export function AbschnittDaten() {
  const { t } = useTranslation()
  const summe = OFFERTEN.reduce((s, o) => s + o.rappen, 0)

  return (
    <Abschnitt id="daten" titel={t('design.daten')} text={t('design.datenText')}>
      <Karte className="overflow-hidden">
        <KarteKopf>
          <KarteTitel>{t('design.offerten')}</KarteTitel>
          <Badge>{t('design.beispieldaten')}</Badge>
        </KarteKopf>
        <Tabelle>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('design.spalte.nr')}</Kopfzelle>
              <Kopfzelle>{t('design.spalte.kunde')}</Kopfzelle>
              <Kopfzelle zahl>kWp</Kopfzelle>
              <Kopfzelle zahl>CHF</Kopfzelle>
              <Kopfzelle>{t('design.spalte.datum')}</Kopfzelle>
              <Kopfzelle>{t('design.spalte.status')}</Kopfzelle>
              <Kopfzelle>
                <span className="sr-only">{t('design.spalte.aktionen')}</span>
              </Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {OFFERTEN.map((o) => (
              <Zeile key={o.nr}>
                <Zelle className="text-muted-foreground font-mono text-[13px] whitespace-nowrap">{o.nr}</Zelle>
                <Zelle>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={o.zustaendig} className="size-6 text-[10px]" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{o.kunde}</span>
                      <span className="text-muted-foreground text-xs">{o.ort}</span>
                    </div>
                  </div>
                </Zelle>
                <Zelle zahl>{o.kwp.toFixed(1)}</Zelle>
                <Zelle zahl>{formatChf(o.rappen)}</Zelle>
                <Zelle className="zahlen whitespace-nowrap">{formatDatum(o.datum)}</Zelle>
                <Zelle>
                  <Badge ton={TON[o.status]} punkt>
                    {t(`design.status.${o.status}`)}
                  </Badge>
                </Zelle>
                <Zelle className="w-10">
                  <Menue>
                    <MenueAusloeser asChild>
                      <Button variant="ghost" size="icon" aria-label={t('design.spalte.aktionen')}>
                        <MoreHorizontal />
                      </Button>
                    </MenueAusloeser>
                    <MenueInhalt align="end">
                      <MenueEintrag>
                        <Pencil /> {t('allgemein.bearbeiten')}
                      </MenueEintrag>
                      <MenueEintrag>
                        <Copy /> {t('design.neueVersion')}
                      </MenueEintrag>
                      <MenueTrenner />
                      <MenueEintrag gefahr>
                        <Trash2 /> {t('design.papierkorb')}
                      </MenueEintrag>
                    </MenueInhalt>
                  </Menue>
                </Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
          <tfoot>
            <tr className="bg-surface-2 border-t">
              <Zelle colSpan={3} className="text-muted-foreground text-xs font-medium">
                {t('design.summe', { anzahl: OFFERTEN.length })}
              </Zelle>
              <Zelle zahl className="font-semibold">
                {formatChf(summe)}
              </Zelle>
              <Zelle colSpan={3} />
            </tr>
          </tfoot>
        </Tabelle>
      </Karte>

      <Reiter defaultValue="uebersicht">
        <ReiterListe aria-label={t('design.reiterBeispiel')}>
          <ReiterKnopf value="uebersicht">{t('design.reiter.uebersicht')}</ReiterKnopf>
          <ReiterKnopf value="objekte">{t('design.reiter.objekte')}</ReiterKnopf>
          <ReiterKnopf value="offerten">{t('design.reiter.offerten')}</ReiterKnopf>
          <ReiterKnopf value="projekte">{t('design.reiter.projekte')}</ReiterKnopf>
        </ReiterListe>
        <ReiterInhalt value="uebersicht">
          <div className="grid gap-4 md:grid-cols-3">
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('design.karteKontakt')}</KarteTitel>
              </KarteKopf>
              <KarteInhalt className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Familie Gerber</span>
                <span className="text-muted-foreground">Dorfstrasse 12, 5630 Muri AG</span>
                <span className="zahlen text-muted-foreground">+41 56 123 45 67</span>
              </KarteInhalt>
            </Karte>
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('design.karteAnlage')}</KarteTitel>
              </KarteKopf>
              <KarteInhalt className="zahlen flex flex-col gap-1 text-sm">
                <span>9.8 kWp · 24 {t('design.module')}</span>
                <span className="text-muted-foreground">{t('design.speicher')} 10 kWh</span>
                <span className="text-muted-foreground">{t('design.ertrag')} 9'650 kWh/a</span>
              </KarteInhalt>
            </Karte>
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('design.karteNaechstes')}</KarteTitel>
                <Badge ton="warnung">{formatDatum('2026-10-24')}</Badge>
              </KarteKopf>
              <KarteInhalt className="text-muted-foreground text-sm">{t('design.karteNaechstesText')}</KarteInhalt>
            </Karte>
          </div>
        </ReiterInhalt>
        {(['objekte', 'offerten', 'projekte'] as const).map((r) => (
          <ReiterInhalt key={r} value={r}>
            <p className="text-muted-foreground text-sm">{t('design.reiterLeer')}</p>
          </ReiterInhalt>
        ))}
      </Reiter>
    </Abschnitt>
  )
}
