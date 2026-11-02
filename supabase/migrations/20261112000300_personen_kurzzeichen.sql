-- Kurzzeichen je Person (2.11.2026): zwei bis vier Buchstaben wie «CR» oder «LP», für Listen, Karten, Planung
-- und Dokumente. Bewusst eine neue Spalte: «kuerzel» bleibt der technische Schlüssel («andreas»), über den
-- Zuständigkeiten, Posteingang-Vertretung und Offerten-Zuteilung Personen finden.
-- Vorschlag aus Vor- und Nachname, ändern kann die Administration in Einstellungen › Personen.

alter table public.personen add column if not exists kurzzeichen text;

-- Vorschlag: erster Buchstabe Vorname + erster Buchstabe Nachname («Chris Rosenberg» → CR), bei nur einem Wort
-- die ersten zwei Buchstaben («Loris» → LO). Ist das schon vergeben, mehr Buchstaben vom Nachnamen (DSA), dann
-- vom Vornamen, zuletzt eine Ziffer. p_ohne: die Person selbst (beim Ändern) zählt nicht als vergeben.
create or replace function intern.kurzzeichen_vorschlag(p_name text, p_ohne uuid default null)
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  teile text[] := array(select w from regexp_split_to_table(translate(coalesce(p_name, ''), '.,''’()', ''), '[[:space:]-]+') w where w <> '');
  vor   text := upper(coalesce(teile[1], ''));
  nach  text := upper(coalesce(teile[array_length(teile, 1)], ''));
  kandidaten text[];
  k text;
  i int;
begin
  if vor = '' then
    return null;
  end if;
  if array_length(teile, 1) > 1 then
    kandidaten := array[left(vor, 1) || left(nach, 1), left(vor, 1) || left(nach, 2), left(vor, 2) || left(nach, 1),
                        left(vor, 1) || left(nach, 3)];
  else
    kandidaten := array[left(vor, 2), left(vor, 3), left(vor, 4)];
  end if;
  foreach k in array kandidaten loop
    if not exists (select 1 from public.personen p
                    where upper(p.kurzzeichen) = k and p.geloescht_am is null and p.id is distinct from p_ohne) then
      return k;
    end if;
  end loop;
  for i in 2..99 loop
    k := left(kandidaten[1], 4 - length(i::text)) || i;
    if not exists (select 1 from public.personen p
                    where upper(p.kurzzeichen) = k and p.geloescht_am is null and p.id is distinct from p_ohne) then
      return k;
    end if;
  end loop;
  return null;
end;
$$;

-- Leer = Vorschlag; sonst nur gross geschrieben und ohne Leerzeichen. Ein Namenswechsel ändert das Kurzzeichen nicht.
create or replace function intern.personen_kurzzeichen()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.kurzzeichen := nullif(upper(regexp_replace(coalesce(new.kurzzeichen, ''), '[[:space:]]', '', 'g')), '');
  if new.kurzzeichen is null then
    new.kurzzeichen := intern.kurzzeichen_vorschlag(new.name, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists kurzzeichen on public.personen;
create trigger kurzzeichen before insert or update of kurzzeichen, name on public.personen
  for each row execute function intern.personen_kurzzeichen();

-- Bestehende Personen der Reihe nach (älteste zuerst bekommen das kürzere Zeichen).
do $$
declare r record;
begin
  for r in select id from public.personen where kurzzeichen is null order by erstellt_am, name loop
    update public.personen set kurzzeichen = null where id = r.id;
  end loop;
end;
$$;

alter table public.personen
  add constraint personen_kurzzeichen_format check (length(kurzzeichen) between 1 and 4 and kurzzeichen = upper(kurzzeichen) and kurzzeichen !~ '\s');
create unique index if not exists personen_kurzzeichen_eindeutig
  on public.personen (kurzzeichen) where geloescht_am is null;

comment on column public.personen.kurzzeichen is
  'Anzeige-Kürzel (CR, LP), 1–4 Zeichen, gross, eindeutig. Nicht verwechseln mit kuerzel (technischer Schlüssel).';
