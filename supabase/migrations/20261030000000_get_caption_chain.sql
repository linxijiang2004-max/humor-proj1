-- Lets bit read the caption chain the admin console manages.
--
-- The Week 7 tables (prompt_chains, prompt_chain_steps, prompt_chain_mix,
-- llm_models, llm_providers, terms, generation_examples) are readable only by
-- superadmins, and bit runs as the signed-in user. Instead of opening those
-- tables to every user, this one read-only function picks a chain and returns
-- just what generation needs. Run it in the Supabase SQL editor.
--
-- Picks one chain from prompt_chain_mix (is_enabled, weight > 0, chain
-- is_active), weighted-random by weight, and returns:
--   {
--     chain_id, chain_name,
--     default_model: {model_string, provider, provider_slug, provider_active} | null,
--     steps: [{step_index, step_name, prompt_template, model: {...} | null}],
--     terms: [{term, category}],
--     examples: [{input_description, output_caption, is_positive, notes}]
--   }
-- or null when no chain is enabled. A step's model is null when it has none
-- or its model is inactive; bit then uses default_model.

create or replace function public.get_caption_chain()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chain_id bigint;
  v_chain_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'must be signed in';
  end if;

  -- Weighted random pick (Efraimidis–Spirakis): smallest -ln(u)/weight wins.
  select c.id, c.name into v_chain_id, v_chain_name
  from public.prompt_chain_mix m
  join public.prompt_chains c on c.id = m.chain_id
  where m.is_enabled and c.is_active and m.weight > 0
  order by -ln(1 - random()) / m.weight::float8
  limit 1;

  if v_chain_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'chain_id', v_chain_id,
    'chain_name', v_chain_name,
    'default_model', (
      select jsonb_build_object(
        'model_string', lm.model_string,
        'provider', lp.name,
        'provider_slug', lp.slug,
        'provider_active', lp.is_active)
      from public.llm_models lm
      join public.llm_providers lp on lp.id = lm.provider_id
      where lm.is_default and lm.is_active
      order by lm.id
      limit 1),
    'steps', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'step_index', s.step_index,
        'step_name', s.step_name,
        'prompt_template', s.prompt_template,
        'model', case when lm.is_active then jsonb_build_object(
          'model_string', lm.model_string,
          'provider', lp.name,
          'provider_slug', lp.slug,
          'provider_active', lp.is_active) end
      ) order by s.step_index), '[]'::jsonb)
      from public.prompt_chain_steps s
      left join public.llm_models lm on lm.id = s.model_id
      left join public.llm_providers lp on lp.id = lm.provider_id
      where s.chain_id = v_chain_id),
    'terms', (
      select coalesce(jsonb_agg(jsonb_build_object('term', t.term, 'category', t.category)), '[]'::jsonb)
      from (
        select term, category from public.terms
        where is_active
        order by term
        limit 50
      ) t),
    -- This chain's examples plus any that aren't tied to a chain.
    'examples', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'input_description', e.input_description,
        'output_caption', e.output_caption,
        'is_positive', e.is_positive,
        'notes', e.notes)), '[]'::jsonb)
      from (
        select input_description, output_caption, is_positive, notes
        from public.generation_examples
        where chain_id = v_chain_id or chain_id is null
        order by created_at desc, id desc
        limit 20
      ) e)
  );
end;
$$;

revoke all on function public.get_caption_chain() from public;
grant execute on function public.get_caption_chain() to authenticated;
