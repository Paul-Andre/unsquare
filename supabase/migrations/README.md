# Database migrations

This folder holds Postgres migrations for the Supabase project. The baseline schema is in `20260524033458_initial_remote_schema.sql` (from `supabase db pull` against the linked project).

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase login`)
- **Docker**, with permission to use the Docker socket (the CLI uses it for `db pull` / `db dump` even against a linked remote project)

## One-time: refresh schema from remote

From the repository root (after `supabase link` has been run for this project):

```bash
supabase db pull initial_remote_schema --yes
```

That creates a new timestamped SQL file under `supabase/migrations/` reflecting the linked project’s schema (tables, RLS, functions, etc.).

If `db pull` fails with a Docker error, fix Docker access first, or use **SQL Editor → schema export** in the dashboard as a stopgap and split the result into a migration by hand.

If image pulls fail with `toomanyrequests`, wait a few minutes and retry, or log in to a Docker registry mirror if you use one.

### `readonly_role`

The baseline migration includes `GRANT` statements for a custom role `readonly_role`. A small `DO $$ … CREATE ROLE … $$` block was added at the top of that migration so it applies on fresh local/shadow databases (where that role does not exist yet). Hosted projects that already have the role are unaffected.

### Aligning migration history with an existing database

If the database already matched this migration before it existed in git (typical after the first `db pull`), mark it **applied** on the linked project so a future `db push` does not try to re-run the whole file:

```bash
supabase migration repair 20260524033458 --status applied --linked --yes
```

(Already done once for the current baseline; repeat with a new version when you add the next pulled migration.)

## Ongoing workflow

1. Prefer changing the database via new migration files, then `supabase db push` (or apply through your usual release process).
2. Avoid editing production only in the dashboard without a matching migration, or the repo will drift from the server.

## Edge Functions

Remote function source can be refreshed without Docker:

```bash
supabase functions download <function-name> --project-ref vatpvuolfdnkcgdwgsxm --use-api
```

Project ref matches the hostname `vatpvuolfdnkcgdwgsxm.supabase.co`.