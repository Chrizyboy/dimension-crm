-- Chris 12.11.2026: 40-Stunden-Woche und 5 Wochen Ferien (25 Arbeitstage) für Zeiterfassung und Berechnung.
-- Gilt für Soll/Saldo der Zeiterfassung und das Wochenblatt der Baustelle; eigene Werte in der Personal-Akte
-- (wochenstunden, ferientage) gehen weiterhin vor.
update public.einstellungen
   set wert = wert || '{"wochenstunden": 40, "ferientage": 25}'::jsonb
 where schluessel = 'zeiterfassung';

update public.einstellungen
   set wert = jsonb_set(wert, '{zeiten,woche_soll_h}', '40'::jsonb, true)
 where schluessel = 'baustelle' and wert ? 'zeiten';
