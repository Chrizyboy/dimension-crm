-- Freigabe vor dem Senden bei Rabatt/Marge ausschalten (Chris 27.11.2026: «Alle drei ausblenden», nie besprochen).
-- Nur der Schalter in einstellungen.offerten.freigabe.aktiv; Schwellen und Funktionen bleiben, die Administration
-- kann ihn jederzeit wieder einschalten. Ohne «aktiv» liefert intern.offerte_freigabe_grund null, das Senden
-- braucht keine Freigabe mehr.
update public.einstellungen
   set wert = jsonb_set(wert, '{freigabe,aktiv}', 'false'::jsonb, true)
 where schluessel = 'offerten'
   and wert ? 'freigabe';
