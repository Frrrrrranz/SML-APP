-- =============================================
-- Supabase Storage RLS 策略
-- NOTE: 已登录用户可上传/更新，仅管理员可删除
-- =============================================

-- 1. sheet-music 存储桶
drop policy if exists "Public Access Sheet Music" on storage.objects;
drop policy if exists "Admin can upload sheet music" on storage.objects;
drop policy if exists "Admin can delete sheet music" on storage.objects;
drop policy if exists "Authenticated upload sheet music" on storage.objects;
create policy "Authenticated Access Sheet Music" on storage.objects for select using ( bucket_id = 'sheet-music' AND auth.uid() is not null );

create policy "Authenticated upload sheet music"
 on storage.objects for insert
 with check ( bucket_id = 'sheet-music' AND auth.uid() is not null );

create policy "Admin can delete sheet music"
 on storage.objects for delete
 using ( bucket_id = 'sheet-music' AND public.is_admin() );


-- 2. avatars 存储桶
drop policy if exists "Public Access Avatars" on storage.objects;
drop policy if exists "Admin can upload avatars" on storage.objects;
drop policy if exists "Admin can update avatars" on storage.objects;
drop policy if exists "Admin can delete avatars" on storage.objects;
drop policy if exists "Authenticated upload avatars" on storage.objects;
drop policy if exists "Authenticated update avatars" on storage.objects;
create policy "Authenticated Access Avatars" on storage.objects for select using ( bucket_id = 'avatars' AND auth.uid() is not null );

create policy "Authenticated upload avatars"
 on storage.objects for insert
 with check ( bucket_id = 'avatars' AND auth.uid() is not null );

create policy "Authenticated update avatars"
 on storage.objects for update
 using ( bucket_id = 'avatars' AND auth.uid() is not null );

create policy "Admin can delete avatars"
 on storage.objects for delete
 using ( bucket_id = 'avatars' AND public.is_admin() );


-- 3. recordings 存储桶
drop policy if exists "Public Access Recordings" on storage.objects;
drop policy if exists "Admin can upload recordings" on storage.objects;
drop policy if exists "Admin can delete recordings" on storage.objects;
drop policy if exists "Authenticated upload recordings" on storage.objects;
create policy "Authenticated Access Recordings" on storage.objects for select using ( bucket_id = 'recordings' AND auth.uid() is not null );

create policy "Authenticated upload recordings"
 on storage.objects for insert
 with check ( bucket_id = 'recordings' AND auth.uid() is not null );

create policy "Admin can delete recordings"
 on storage.objects for delete
 using ( bucket_id = 'recordings' AND public.is_admin() );
