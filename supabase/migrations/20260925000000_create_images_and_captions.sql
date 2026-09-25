-- Images and their captions for the AI image-caption app.

create table public.images (
  id bigint generated always as identity primary key,
  url text not null,
  created_at timestamptz not null default now()
);

create table public.captions (
  id bigint generated always as identity primary key,
  image_id bigint not null references public.images (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Postgres does not index foreign keys automatically; this speeds up
-- "all captions for image X" lookups and the join in the list page.
create index captions_image_id_idx on public.captions (image_id);

-- Row Level Security: with RLS on and no policies, nobody can read anything
-- through the API. The policies below allow read-only public access.
alter table public.images enable row level security;
alter table public.captions enable row level security;

create policy "Public can read images"
  on public.images for select
  to anon, authenticated
  using (true);

create policy "Public can read captions"
  on public.captions for select
  to anon, authenticated
  using (true);

-- Table-level privilege for the API roles. Supabase usually grants this by
-- default, but being explicit keeps the migration working either way.
grant select on public.images, public.captions to anon, authenticated;
