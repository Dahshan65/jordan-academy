-- Run once in Supabase SQL Editor. Never expose secret/service_role keys in browser.
create extension if not exists pgcrypto;
create table if not exists public.academy_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.courses (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 90),
 category text not null default 'أخرى', description text not null default '', published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null check(length(title) between 1 and 100), type text not null default 'text' check(type in ('video','pdf','text')),
 url text, body text not null default '', created_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons(course_id);
create index if not exists courses_published_idx on public.courses(published);
alter table public.academy_admins enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
create or replace function public.is_academy_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.academy_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_academy_admin() from public;
grant execute on function public.is_academy_admin() to anon, authenticated;
create policy "admin sees own admin record" on public.academy_admins for select to authenticated using (user_id=(select auth.uid()));
create policy "public sees published courses" on public.courses for select to anon,authenticated using (published or public.is_academy_admin());
create policy "admin inserts courses" on public.courses for insert to authenticated with check(public.is_academy_admin());
create policy "admin updates courses" on public.courses for update to authenticated using(public.is_academy_admin()) with check(public.is_academy_admin());
create policy "admin deletes courses" on public.courses for delete to authenticated using(public.is_academy_admin());
create policy "public sees published lessons" on public.lessons for select to anon,authenticated using(public.is_academy_admin() or exists(select 1 from public.courses c where c.id=course_id and c.published));
create policy "admin inserts lessons" on public.lessons for insert to authenticated with check(public.is_academy_admin());
create policy "admin updates lessons" on public.lessons for update to authenticated using(public.is_academy_admin()) with check(public.is_academy_admin());
create policy "admin deletes lessons" on public.lessons for delete to authenticated using(public.is_academy_admin());
-- After creating your own user in Authentication > Users, run privately in SQL Editor:
-- insert into public.academy_admins(user_id) values ('YOUR_AUTH_USER_UUID');
