-- Kennzahl «Nachfassen fällig»: Offerten ohne Angebotsdatum und ohne Nachfass-Termin zählen mit.
-- intern.stand_offerte zeigt sie schon als «nachfassen» (wie V233 offerFollowUpDue: ohne Datum = fällig),
-- die Kennzahl verlangte aber faellig_am <= heute und liess sie weg (gefunden im Abgleich alt gegen neu).
-- Nur diese eine Bedingung ändert sich; der Rest der Funktion bleibt wie in 20261105000200.

do $$
declare
  alt text := 'where stand = ''nachfassen'' and faellig_am <= heute.d';
  neu text := 'where stand = ''nachfassen'' and (faellig_am is null or faellig_am <= heute.d)';
  definition text := pg_get_functiondef('public.kennzahlen_fakten(date, date)'::regprocedure);
begin
  if position(alt in definition) = 0 then
    raise exception 'kennzahlen_fakten: Bedingung für nf_faellig nicht gefunden';
  end if;
  execute replace(definition, alt, neu);
end
$$;
