-- Zusätze GL/Administration nachholen (Chris 27.11.2026: «die interne preise auch»).
-- 20261115471827_rollen_zusaetze setzte die Zusätze nur, wo die Person noch die alte Rolle «admin»/«mitarbeit» hatte.
-- Wer in der Cloud schon eine Fachrolle hatte, blieb ohne «gl» und sah z. B. in «Preise» nur «Für Kunden».
-- Hier nur ergänzen, nie wegnehmen; Personen über Kürzel oder Mail, damit es in jeder Datenbank greift.
update public.personen p
   set rechte = array(select distinct x from unnest(p.rechte || z.zusatz) x order by 1)
  from (values ('chris', 'chris@dimension-solaire.ch', '{gl,admin}'::text[]),
               ('loris', 'loris@dimension-solaire.ch', '{admin}'),
               ('andreas', 'andreas@dimension-solaire.ch', '{gl}'),
               ('erich', 'erich@dimension-solaire.ch', '{gl}')) as z (kuerzel, email, zusatz)
 where (p.kuerzel = z.kuerzel or lower(p.email) = z.email)
   and p.geloescht_am is null
   and not (p.rechte @> z.zusatz);
