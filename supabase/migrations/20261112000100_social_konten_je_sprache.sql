-- Social Media mit je einem deutschen und einem französischen Konto (Entscheid 0037).
-- Dimension Solaire hat bei Facebook, Instagram und LinkedIn je ein Konto pro Sprache. Eine Anmeldung bei Meta bzw.
-- LinkedIn bringt alle Seiten mit, die die Person verwaltet (intern.social_konten.konto.seiten / .organisationen).
-- Welche Seite deutsch und welche französisch ist, steht in konto.zuordnung: {"facebook": {"de": id, "fr": id}, …}.

/** Verbindungen (ohne Token) für die App, neu mit den wählbaren Konten und der Zuordnung zu Deutsch/Französisch. */
drop function if exists public.social_verbindungen();
create function public.social_verbindungen()
returns table (dienst text, name text, verbunden boolean, verbunden_am timestamptz, ablauf timestamptz, fehler text,
               von text, konten jsonb, zuordnung jsonb)
language sql stable security definer set search_path = '' as $$
  select d.dienst, k.name, k.token is not null, k.verbunden_am, k.ablauf, k.fehler,
         (select p.kuerzel from public.personen p where p.id = k.verbunden_von),
         case when k.token is null then '[]'::jsonb
              when d.dienst = 'meta' then coalesce(k.konto -> 'seiten',
                case when k.konto ? 'seite_id' then jsonb_build_array(jsonb_build_object(
                  'id', k.konto ->> 'seite_id', 'name', k.konto ->> 'seite_name',
                  'instagram_id', k.konto -> 'instagram_id', 'instagram_name', k.konto -> 'instagram_name')) end, '[]')
              when d.dienst = 'linkedin' then coalesce(k.konto -> 'organisationen',
                case when k.konto ? 'organisation' then jsonb_build_array(jsonb_build_object(
                  'id', k.konto ->> 'organisation', 'name', k.name)) end, '[]')
              else '[]'::jsonb end,
         case when k.token is null then '{}'::jsonb else coalesce(k.konto -> 'zuordnung', '{}') end
    from (values ('meta'), ('linkedin'), ('canva')) d (dienst)
    left join intern.social_konten k on k.dienst = d.dienst
   where intern.hat_recht('basis')
$$;
revoke execute on function public.social_verbindungen() from public, anon;
grant execute on function public.social_verbindungen() to authenticated;

/**
 * Welches Konto deutsch und welches französisch ist (nur Administration). p_netzwerk facebook, instagram oder
 * linkedin; p_konto muss eine der verbundenen Seiten sein (bei Instagram eine Seite mit Instagram-Konto).
 */
create or replace function public.social_zuordnung_setzen(p_netzwerk text, p_sprache text, p_konto text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_dienst text := case when p_netzwerk = 'linkedin' then 'linkedin' else 'meta' end;
  v_konto jsonb;
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'social.kein_recht';
  end if;
  if p_netzwerk not in ('facebook', 'instagram', 'linkedin') or p_sprache not in ('de', 'fr') then
    raise exception using errcode = 'P0001', message = 'social.konto_unbekannt';
  end if;
  select k.konto into v_konto from intern.social_konten k where k.dienst = v_dienst and k.token is not null for update;
  if v_konto is null then raise exception using errcode = 'P0001', message = 'social.nicht_verbunden'; end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_konto -> 'seiten', v_konto -> 'organisationen', '[]')) e
     where e ->> 'id' = p_konto
       and (p_netzwerk <> 'instagram' or nullif(e ->> 'instagram_id', '') is not null)
  ) then
    raise exception using errcode = 'P0001', message = 'social.konto_unbekannt';
  end if;
  update intern.social_konten
     set konto = jsonb_set(
           case when konto ? 'zuordnung' then konto else konto || '{"zuordnung": {}}' end,
           array['zuordnung', p_netzwerk],
           coalesce(konto -> 'zuordnung' -> p_netzwerk, '{}') || jsonb_build_object(p_sprache, p_konto))
   where dienst = v_dienst;
end
$$;
revoke execute on function public.social_zuordnung_setzen(text, text, text) from public, anon;
grant execute on function public.social_zuordnung_setzen(text, text, text) to authenticated;
