-- Sample data. Paste into the Supabase SQL Editor after running the migration.

insert into public.images (url) values
  ('https://picsum.photos/id/237/800/450'),
  ('https://picsum.photos/id/1025/800/450'),
  ('https://picsum.photos/id/1080/800/450');

insert into public.captions (image_id, content)
select id, caption
from public.images
join (values
  ('https://picsum.photos/id/237/800/450',  'A black puppy staring into your soul, asking for snacks.'),
  ('https://picsum.photos/id/237/800/450',  'When you hear the treat bag from three rooms away.'),
  ('https://picsum.photos/id/1025/800/450', 'A pug wrapped in a blanket, fully committed to doing nothing today.'),
  ('https://picsum.photos/id/1080/800/450', 'Strawberries that clearly have their life together.')
) as seed(url, caption) using (url);
