-- ===== 1. 归属 + 描述缓存 + 图库标记 =====
alter table public.images
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists description text,
  add column if not exists is_library boolean not null default false;

alter table public.captions
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- ===== 2. 生成记录 =====
create table if not exists public.caption_requests (
  id bigint generated always as identity primary key,
  image_id bigint not null references public.images(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.caption_request_steps (
  id bigint generated always as identity primary key,
  caption_request_id bigint not null references public.caption_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  step_index int not null,
  step_name text not null,
  prompt text not null,
  model text not null,
  raw_output text,
  created_at timestamptz not null default now()
);

-- ===== 3. captions 扩展 =====
alter table public.captions
  add column if not exists caption_request_id bigint references public.caption_requests(id) on delete set null,
  add column if not exists is_public boolean not null default false,
  add column if not exists like_count integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ===== 4. 投票 =====
create table if not exists public.caption_votes (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (profile_id, caption_id)
);

-- ===== 5. 索引（RLS 策略用到的列）=====
create index if not exists idx_images_profile   on public.images(profile_id);
create index if not exists idx_images_library   on public.images(is_library);
create index if not exists idx_captions_profile on public.captions(profile_id);
create index if not exists idx_captions_feed    on public.captions(is_public, like_count desc);
create index if not exists idx_votes_profile    on public.caption_votes(profile_id);
create index if not exists idx_votes_caption    on public.caption_votes(caption_id);
create index if not exists idx_steps_profile    on public.caption_request_steps(profile_id);

-- ===== 6. like_count 自动同步 =====
create or replace function public.sync_caption_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.captions
  set like_count = (
    select coalesce(sum(vote_value), 0)
    from public.caption_votes
    where caption_id = coalesce(new.caption_id, old.caption_id)
  )
  where id = coalesce(new.caption_id, old.caption_id);
  return null;
end $$;

drop trigger if exists trg_sync_like_count on public.caption_votes;
create trigger trg_sync_like_count
after insert or update or delete on public.caption_votes
for each row execute function public.sync_caption_like_count();

-- ===== 7. 描述缓存用的 security definer 函数 =====
-- 图库图片没有 profile_id，普通 update 策略写不进去，所以走这个
create or replace function public.cache_image_description(p_image_id bigint, p_description text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    raise exception 'must be signed in';
  end if;
  update public.images set description = p_description
  where id = p_image_id and description is null;
end $$;

revoke all on function public.cache_image_description(bigint, text) from public;
grant execute on function public.cache_image_description(bigint, text) to authenticated;

-- ===== 8. 新表开 RLS =====
alter table public.caption_requests      enable row level security;
alter table public.caption_request_steps enable row level security;
alter table public.caption_votes         enable row level security;

-- ===== 9. 策略 =====

-- images：登录用户可以传自己的图
drop policy if exists "wk4 images insert own" on public.images;
create policy "wk4 images insert own" on public.images
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

-- captions：先清掉旧的「所有人可读」，否则草稿也会被看到
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='captions' and cmd='SELECT'
  loop
    execute format('drop policy %I on public.captions', p.policyname);
  end loop;
end $$;

create policy "wk4 captions read public or own" on public.captions
  for select to anon, authenticated
  using (is_public or (select auth.uid()) = profile_id);

drop policy if exists "wk4 captions insert own" on public.captions;
create policy "wk4 captions insert own" on public.captions
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "wk4 captions update own" on public.captions;
create policy "wk4 captions update own" on public.captions
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

-- 生成记录：prompt 是私有的，只有自己能看
create policy "wk4 requests own read" on public.caption_requests
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
create policy "wk4 requests own insert" on public.caption_requests
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

create policy "wk4 steps own read" on public.caption_request_steps
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
create policy "wk4 steps own insert" on public.caption_request_steps
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

-- 投票：票数公开，但只能动自己的
create policy "wk4 votes public read" on public.caption_votes
  for select to anon, authenticated using (true);
create policy "wk4 votes own insert" on public.caption_votes
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
create policy "wk4 votes own update" on public.caption_votes
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
create policy "wk4 votes own delete" on public.caption_votes
  for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
