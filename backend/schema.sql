-- Create composers table
create table if not exists composers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  period text not null,
  image text not null,
  sheet_music_count int default 0,
  recording_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create works table
create table if not exists works (
  id uuid default uuid_generate_v4() primary key,
  composer_id uuid references composers(id) on delete cascade not null,
  title text not null,
  edition text,
  year text,
  file_url text,
  source_url text,
  source_credit text,
  license text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create recordings table
create table if not exists recordings (
  id uuid default uuid_generate_v4() primary key,
  composer_id uuid references composers(id) on delete cascade not null,
  title text not null,
  performer text,
  duration text,
  year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) if needed, but for now we can leave it open or set policies.
-- For simplicity in this demo, we might want to disable RLS or create a policy to allow public access if auth is not implemented.
alter table composers enable row level security;
alter table works enable row level security;
alter table recordings enable row level security;

-- Create policies to allow public read/write (WARNING: In production, secure this!)
-- 创建自定义函数来检查是否为管理员
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 1. 清理 Composers (包含冗余策略)
DROP POLICY IF EXISTS "Enable all access for all users" ON composers;
DROP POLICY IF EXISTS "Enable read access for all" ON composers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON composers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON composers;
DROP POLICY IF EXISTS "Enable delete for admin" ON composers;
DROP POLICY IF EXISTS "Public Access Composers" ON composers;
DROP POLICY IF EXISTS "Admin only Composers Insert" ON composers;
DROP POLICY IF EXISTS "Admin only Composers Update" ON composers;
DROP POLICY IF EXISTS "Admin only Composers Delete" ON composers;
DROP POLICY IF EXISTS "Authenticated Access Composers" ON composers;
DROP POLICY IF EXISTS "Authenticated Composers Insert" ON composers;
DROP POLICY IF EXISTS "Authenticated Composers Update" ON composers;

CREATE POLICY "Authenticated Access Composers" ON composers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Composers Insert" ON composers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Composers Update" ON composers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin only Composers Delete" ON composers FOR DELETE USING (public.is_admin());

-- 2. 清理 Works (包含冗余策略)
DROP POLICY IF EXISTS "Enable all access for all users" ON works;
DROP POLICY IF EXISTS "Enable read access for all" ON works;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON works;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON works;
DROP POLICY IF EXISTS "Enable delete for admin" ON works;
DROP POLICY IF EXISTS "Public Access Works" ON works;
DROP POLICY IF EXISTS "Admin only Works Insert" ON works;
DROP POLICY IF EXISTS "Admin only Works Update" ON works;
DROP POLICY IF EXISTS "Admin only Works Delete" ON works;
DROP POLICY IF EXISTS "Authenticated Access Works" ON works;
DROP POLICY IF EXISTS "Authenticated Works Insert" ON works;
DROP POLICY IF EXISTS "Authenticated Works Update" ON works;

CREATE POLICY "Authenticated Access Works" ON works FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Works Insert" ON works FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Works Update" ON works FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin only Works Delete" ON works FOR DELETE USING (public.is_admin());

-- 3. 清理 Recordings (包含冗余策略)
DROP POLICY IF EXISTS "Enable all access for all users" ON recordings;
DROP POLICY IF EXISTS "Enable read access for all" ON recordings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Enable delete for admin" ON recordings;
DROP POLICY IF EXISTS "Public Access Recordings" ON recordings;
DROP POLICY IF EXISTS "Admin only Recordings Insert" ON recordings;
DROP POLICY IF EXISTS "Admin only Recordings Update" ON recordings;
DROP POLICY IF EXISTS "Admin only Recordings Delete" ON recordings;
DROP POLICY IF EXISTS "Authenticated Access Recordings" ON recordings;
DROP POLICY IF EXISTS "Authenticated Recordings Insert" ON recordings;
DROP POLICY IF EXISTS "Authenticated Recordings Update" ON recordings;

CREATE POLICY "Authenticated Access Recordings" ON recordings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Recordings Insert" ON recordings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated Recordings Update" ON recordings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin only Recordings Delete" ON recordings FOR DELETE USING (public.is_admin());
