-- Saves one caption generation run atomically: the cached image description,
-- the caption_requests row, its steps, and the candidate captions. A Postgres
-- function body runs in a single transaction, so if any insert fails nothing
-- is kept (no orphaned caption_requests rows).
--
-- security invoker: runs as the calling user, so the existing RLS insert
-- policies (profile_id = auth.uid()) still apply to every row.

create or replace function public.save_caption_request(
  p_image_id bigint,
  p_description text,   -- null when the description was already cached
  p_steps jsonb,        -- [{step_index, step_name, prompt, model, raw_output}]
  p_captions text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request_id bigint;
  v_captions jsonb;
begin
  if v_uid is null then
    raise exception 'must be signed in';
  end if;

  if p_description is not null then
    perform public.cache_image_description(p_image_id, p_description);
  end if;

  insert into public.caption_requests (image_id, profile_id)
  values (p_image_id, v_uid)
  returning id into v_request_id;

  insert into public.caption_request_steps
    (caption_request_id, profile_id, step_index, step_name, prompt, model, raw_output)
  select v_request_id, v_uid,
         (s ->> 'step_index')::int, s ->> 'step_name', s ->> 'prompt',
         s ->> 'model', s ->> 'raw_output'
  from jsonb_array_elements(p_steps) as s;

  with inserted as (
    insert into public.captions
      (image_id, content, profile_id, caption_request_id, is_public)
    select p_image_id, c, v_uid, v_request_id, false
    from unnest(p_captions) as c
    returning id, content
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'content', content) order by id), '[]'::jsonb)
  into v_captions
  from inserted;

  return jsonb_build_object('request_id', v_request_id, 'captions', v_captions);
end;
$$;

revoke all on function public.save_caption_request(bigint, text, jsonb, text[]) from public;
grant execute on function public.save_caption_request(bigint, text, jsonb, text[]) to authenticated;
