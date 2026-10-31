-- Monteur-Version (Chris 31.10.2026): eine Rolle, die nur Arbeitszeit und Spesen sieht, mit zwei grossen
-- Knöpfen statt des ganzen CRM. Welche Rolle die einfache Ansicht bekommt, ist Konfiguration (Spalte «ansicht»),
-- nicht im Code; die Administration kann sie im Rollen-Dialog umstellen.

alter table public.rollen add column if not exists ansicht text not null default 'voll';
alter table public.rollen drop constraint if exists rollen_ansicht_gueltig;
alter table public.rollen add constraint rollen_ansicht_gueltig check (ansicht in ('voll', 'einfach'));
comment on column public.rollen.ansicht is
  '«voll»: ganzes CRM mit Seitenleiste. «einfach»: nur Startseite mit Arbeitszeit und Spesen (Monteure).';

-- Zeiten liegen im Bereich «fieldwork», Spesen in «expenses»: die Rechte (RLS) bleiben damit dieselben wie bei «Montage».
insert into public.rollen (schluessel, name_de, name_fr, beschreibung_de, beschreibung_fr, rechte, bereiche, reihenfolge, ansicht)
values (
  'monteur', 'Monteur (Zeit & Spesen)', 'Monteur (temps & frais)',
  'Nur Arbeitszeit per Knopfdruck und Spesen mit Belegfoto, am Handy oder PC.',
  'Uniquement le temps de travail d’un clic et les frais avec photo du justificatif, sur mobile ou PC.',
  '{}', '{fieldwork,expenses}', 55, 'einfach'
)
on conflict (schluessel) do nothing;

-- meine_anmeldung liefert die Ansicht mit, damit die App den Rahmen wählen kann.
create or replace function public.meine_anmeldung()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person public.personen;
  v_rolle public.rollen;
begin
  select * into v_person from public.personen
  where auth_user_id = auth.uid() and aktiv and geloescht_am is null;
  if not found then
    return null;
  end if;
  select * into v_rolle from public.rollen where schluessel = v_person.rolle;

  -- Höchstens alle 15 Minuten, damit das Protokoll nicht mit Anmeldungen vollläuft.
  if v_person.zuletzt_aktiv is null or v_person.zuletzt_aktiv < now() - interval '15 minutes' then
    update public.personen set zuletzt_aktiv = now() where id = v_person.id;
  end if;

  return jsonb_build_object(
    'id', v_person.id,
    'kuerzel', v_person.kuerzel,
    'name', v_person.name,
    'email', v_person.email,
    'rolle', v_person.rolle,
    'rolle_name', jsonb_build_object('de', v_rolle.name_de, 'fr', v_rolle.name_fr),
    'rechte', (select coalesce(jsonb_agg(distinct r), '[]') from unnest(v_person.rechte || coalesce(v_rolle.rechte, '{}')) r),
    'bereiche', to_jsonb(case when cardinality(v_person.bereiche) > 0 then v_person.bereiche else coalesce(v_rolle.bereiche, '{}') end),
    'ansicht', coalesce(v_rolle.ansicht, 'voll'),
    'sprache', v_person.sprache,
    'darstellung', v_person.darstellung,
    'standort_id', v_person.standort_id,
    'profil', v_person.profil
  );
end;
$$;
revoke execute on function public.meine_anmeldung() from public, anon;
grant execute on function public.meine_anmeldung() to authenticated;
