# MIB Acrobatics

Next.js (App Router) + Supabase platform for the MIB Acrobatics club: public landing page, AcroFeed social feed,
coach messenger and the Admin/Media Command Center.

## Setup

1. Supabase → SQL Editor → run `supabase/migrations/0001_init.sql`, then `0002_reactions.sql` and `0003_schedule.sql` (all idempotent, safe to re-run). It creates the
   tables, RLS policies, role helpers, the `feed_posts` view, Realtime publication entries and the public
   `mib_media` Storage bucket with its policies.
2. Supabase → Authentication → URL Configuration: set **Site URL** to the production origin and add
   `<origin>/auth/callback` to the redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. `npm install && npm run dev`.
5. After the coach (Marius) and the media account (Claudiu) sign up, assign roles in the SQL Editor:

   ```sql
   update public.users set role = 'admin' where email = 'marius@example.com';
   update public.users set role = 'media' where email = 'claudiu@example.com';
   ```

## Roles and routing

| Role         | After login  | Access                                                        |
| ------------ | ------------ | ------------------------------------------------------------- |
| `superadmin` | `/dashboard` | everything, can grant any role                                |
| `admin`      | `/dashboard` | upload, moderation (any post/comment), users, all DMs         |
| `media`      | `/dashboard` | upload zone + own posts only                                  |
| `user`       | `/feed`      | feed, likes, comments, DMs with the coach only                |

`src/proxy.ts` refreshes the session and sends signed-out visitors of `/feed`, `/dashboard`, `/messages` to `/login`.
Layouts enforce roles server-side (`requireRole` in `src/lib/auth.ts`); RLS enforces them again in the database.

## Database notes

- `public.users.email` is not readable by clients; staff use `rpc('admin_list_users')`. Select explicit columns
  (`id, role, full_name, created_at`) instead of `*`.
- Roles change only through `rpc('admin_set_role', { target, new_role })`.
- Uploads go to `mib_media/<auth.uid()>/<file>`; only `media`/`admin`/`superadmin` may upload. Bucket limit is
  50 MB (Supabase Free plan cap) — raise it in the migration and the dashboard on a paid plan.
- `src/lib/supabase/database.types.ts` is hand-written; update it with each migration.
- If you change the bucket limit or MIME list, update `src/lib/media.ts` too (client-side validation).

## Modules

- **Upload Zone** (`/dashboard/upload`): drag-and-drop or pick several photos/videos, add a caption per file,
  choose public/members-only. Files upload straight to Storage with a progress bar, then `createPost` saves the row.
- **Posts** (`/dashboard/posts`): `media` sees and manages own posts; `admin` sees all posts and can delete any.
  Deleting a post also removes its file from Storage.
- **Comment moderation** (`/dashboard/comments`, staff only): latest 200 comments, delete any.
- **AcroFeed** (`/feed`): infinite scroll (keyset pagination), videos auto-play muted while on screen, heart and
  double-tap to react, comments panel (draggable bottom drawer on mobile, side panel on desktop) with live updates.
- **Program & Grupe** (`/dashboard/schedule`, staff only; `0003_schedule.sql`): weekly calendar to add/edit/delete classes.
  Rows with the same `group_name` form one group card on `/` and on the read-only in-app `/schedule` page.
- **Reactions** (`0002_reactions.sql`): 👍 ❤️ 🔥 👏 🤸 on posts (`likes.reaction`) and comments (`comment_reactions`),
  one per user per item. Tap toggles ❤️; hover (mouse) or long-press (touch) opens the reaction bar.
- **Messenger** (`/messages` for members, `/dashboard/messages` inbox for staff): 1-on-1 chat with the coach
  (first `admin`, else a `superadmin`), live delivery and read receipts via Realtime, unread badges in the header
  and sidebar. Staff can open a conversation with any non-staff member from the inbox or from Utilizatori.
- **Utilizatori** (`/dashboard/users`, staff only): search/filter all accounts, see activity, change roles through
  `admin_set_role` (admin: `user` <-> `media`; superadmin: any role; nobody can change their own role).

## Local development with Supabase CLI

`npx supabase start` applies `supabase/migrations` to a local stack (emails land in Mailpit on port 54324).
