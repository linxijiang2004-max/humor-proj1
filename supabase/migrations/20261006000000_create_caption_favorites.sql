-- Saved captions for /favorites. One row per (user, caption).

create table public.caption_favorites (
  caption_id bigint not null references public.captions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, caption_id)
);

-- The primary key covers "is this favorited by me"; this one serves the
-- /favorites list order and the cascade from captions.
create index caption_favorites_profile_created_idx
  on public.caption_favorites (profile_id, created_at desc);
create index caption_favorites_caption_idx
  on public.caption_favorites (caption_id);

alter table public.caption_favorites enable row level security;

create policy "Users can read own favorites"
  on public.caption_favorites for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- The exists() runs under captions RLS, so you can only favorite captions
-- you are allowed to see.
create policy "Users can add own favorites"
  on public.caption_favorites for insert
  to authenticated
  with check (
    (select auth.uid()) = profile_id
    and exists (select 1 from public.captions c where c.id = caption_id)
  );

create policy "Users can remove own favorites"
  on public.caption_favorites for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

grant select, insert, delete on public.caption_favorites to authenticated;

notify pgrst, 'reload schema';
