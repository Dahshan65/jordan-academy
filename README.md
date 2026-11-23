# Jordan Academy V4

Public courses + private administrator. GitHub Pages frontend + Supabase database/auth.

1. Create a Supabase project.
2. Run `schema.sql` in Supabase SQL Editor.
3. In Authentication > Users, create an admin user with a strong password.
4. In SQL Editor, run `insert into public.academy_admins(user_id) values ('YOUR_AUTH_USER_UUID');` using that user's UUID.
5. Paste your Project URL and **publishable/anon** key into `config.js` (never a service_role or secret key).
6. Upload `index.html`, `style.css`, `app.js`, `config.js` to GitHub Pages. Keep `schema.sql` for reference.
7. Visit `#admin` to log in. Published courses are visible to everyone.

IMPORTANT: Existing V3 localStorage courses are NOT automatically migrated. Export a V3 backup before overwriting files. The V4 backup import feature is disabled; migrate courses manually for now. This version does not support private paid videos or file upload; published URLs are public. Supabase auth and RLS enforce admin-only writes.
