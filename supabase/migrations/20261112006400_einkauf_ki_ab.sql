-- Einkauf (Entscheid 0041): die KI liest Auftragsbestätigungen mit dem schnellen Modell (kurze Leseaufgabe).
update public.einstellungen set wert = jsonb_set(wert, '{funktionen,auftragsbestaetigung}', '"schnell"')
 where schluessel = 'ki' and wert ? 'funktionen';
