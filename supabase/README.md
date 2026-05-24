# Supabase CLI — command reference

Run these from the **repository root** (where the `supabase/` directory lives), unless noted.

Project ref for this app: `vatpvuolfdnkcgdwgsxm` (hostname `vatpvuolfdnkcgdwgsxm.supabase.co`).

More detail on migration files and baselining: [migrations/README.md](./migrations/README.md).

---

## Auth & linking (occasionally / new machine)

| Command | Purpose |
|--------|---------|
| `supabase login` | Refresh CLI authentication when needed |
| `supabase link --project-ref vatpvuolfdnkcgdwgsxm --yes` | Link this repo to the hosted project (per clone / machine) |

---

## Schema changes you write in git

| Command | Purpose |
|--------|---------|
| `supabase migration new short_description` | Create a new empty migration under `supabase/migrations/` |
| *(edit the new `*.sql` file)* | Add DDL (tables, policies, functions, etc.) |

### Optional: GUI or local DB → migration

Requires **Docker** for local Supabase.

| Command | Purpose |
|--------|---------|
| `supabase start` | Run the full local stack (Postgres, Studio, …) |
| *(change schema on the **local** DB via Studio or another client)* | |
| `supabase db diff --local -f short_description` | Write a new migration from differences between migrations on disk and the running local DB |

---

## Apply migrations to the hosted (linked) database

| Command | Purpose |
|--------|---------|
| `supabase db push --dry-run` | Show which migrations would run (no changes) |
| `supabase db push` | Apply pending migrations to the **linked** remote project |
| `supabase migration list --linked` | Compare local migration files to remote migration history |

---

## Rare / recovery

| Command | Purpose |
|--------|---------|
| `supabase db pull some_name --yes` | Introspect remote schema into a **new** migration (re-baseline or capture drift; not daily) |
| `supabase migration repair <version> --status applied --linked --yes` | Mark a migration version as applied on remote **without** running its SQL (only when fixing history; use with care) |

---

## Edge Functions

| Command | Purpose |
|--------|---------|
| `supabase functions download <name> --project-ref vatpvuolfdnkcgdwgsxm --use-api` | Download hosted function source into `supabase/functions/` (no Docker) |
| `supabase functions deploy <name>` | Deploy local function code to Supabase |

---

## TypeScript types (web app)

After schema changes, regenerate types (adjust output path if you move it):

```bash
mkdir -p web/src/types
supabase gen types typescript --linked > web/src/types/database.types.ts
```

Then wire `Database` into `createClient<Database>(…)` in `web/src/modules/utils/api.ts` (see comments in that file when you add it).

---

## Local stack

| Command | Purpose |
|--------|---------|
| `supabase start` | Start local Supabase (Docker) |
| `supabase stop` | Stop local stack |
| `supabase db reset --yes` | Reset local DB: re-run all migrations (+ seed if enabled) |

---

## Typical week

1. **`supabase migration new …`** → edit SQL → **`supabase db push`** (use **`--dry-run`** first if you like).
2. **`supabase gen types typescript --linked > …`** whenever the schema changed and you use generated types in the web app.
3. **`supabase functions deploy …`** or **`functions download …`** when Edge Functions change.
4. **`supabase start`**, **`db diff`**, **`db reset`** when you develop against a local database.

---

## Usually not daily

- `supabase db dump` — backups / exports, not routine schema workflow.
- `supabase migration repair` — only for intentional migration history fixes.
