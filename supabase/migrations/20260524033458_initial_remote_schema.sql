


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Pulled from hosted DB; shadow/local instances may not have this role yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_role') THEN
    CREATE ROLE readonly_role NOLOGIN;
  END IF;
END
$$;

COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_hashids" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."decode_contest_hashid"("p_id" "text") RETURNS bigint
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id_decode_once(p_id, 'Lobster contest', 4);
$$;


ALTER FUNCTION "public"."decode_contest_hashid"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encode_contest_hashid"("p_hashid" bigint) RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id_encode(p_hashid, 'Lobster contest', 4);
$$;


ALTER FUNCTION "public"."encode_contest_hashid"("p_hashid" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contest_leaderboard"("p_contest_id" bigint) RETURNS TABLE("player_id" "text", "name" "text", "levels_solved" bigint, "total_moves" bigint, "last_improvement_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
WITH ranked_solutions AS (
  SELECT
    s.player_id,
    s.level_id,
    s.num_moves,
    s.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY s.player_id, s.level_id
      ORDER BY s.num_moves ASC, s.created_at ASC
    ) AS rn
  FROM public.solutions s
  WHERE s.contest = p_contest_id
),
best_solutions AS (
  SELECT
    player_id,
    level_id,
    num_moves  AS best_moves,
    created_at AS best_time
  FROM ranked_solutions
  WHERE rn = 1
),
player_scores AS (
  SELECT
    player_id,
    COUNT(*)           AS levels_solved,
    SUM(best_moves)    AS total_moves,
    MAX(best_time)     AS last_improvement_at
  FROM best_solutions
  GROUP BY player_id
)
SELECT
  p.player_id,
  p.name,
  COALESCE(ps.levels_solved, 0) AS levels_solved,
  COALESCE(ps.total_moves, 0)   AS total_moves,
  ps.last_improvement_at
FROM public.participants p
LEFT JOIN player_scores ps
  ON ps.player_id = p.player_id
WHERE p.contest = p_contest_id
ORDER BY
  levels_solved DESC,
  total_moves ASC,
  last_improvement_at ASC NULLS LAST;
$$;


ALTER FUNCTION "public"."get_contest_leaderboard"("p_contest_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contest_leaderboard"("p_contest_hashid" "text") RETURNS TABLE("player_id" "text", "name" "text", "levels_solved" bigint, "total_moves" bigint, "last_improvement_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT *
  FROM public.get_contest_leaderboard(
    decode_contest_hashid(p_contest_hashid)
  );
$$;


ALTER FUNCTION "public"."get_contest_leaderboard"("p_contest_hashid" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_level_histograms"("p_level_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT jsonb_build_object(
    'allSolutions', (
      SELECT coalesce(
        jsonb_object_agg(num_moves::text, count),
        '{}'::jsonb
      )
      FROM (
        SELECT num_moves, count(*) AS count
        FROM solutions
        WHERE level_id = p_level_id
        GROUP BY num_moves
      ) t
    ),
    'bestPerPlayer', (
      SELECT coalesce(
        jsonb_object_agg(best_moves::text, players),
        '{}'::jsonb
      )
      FROM (
        SELECT best_moves, COUNT(*) AS players
        FROM (
          SELECT player_id, MIN(num_moves) AS best_moves
          FROM solutions
          WHERE level_id = p_level_id
          GROUP BY player_id
        ) best_per_player
        GROUP BY best_moves
      ) t
    ),
    'uniqueSolutions', (
      SELECT coalesce(
        jsonb_object_agg(num_moves::text, distinct_solution_count),
        '{}'::jsonb
      )
      FROM (
        SELECT num_moves, COUNT(DISTINCT solution) AS distinct_solution_count
        FROM solutions
        WHERE level_id = p_level_id
        GROUP BY num_moves
      ) t
    )
  );
$$;


ALTER FUNCTION "public"."get_level_histograms"("p_level_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_level_histograms_and_summary"("p_level_id" "text", "p_player_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT jsonb_build_object(
    'player_summary', get_player_level_summary(p_player_id, p_level_id),
    'histogram', get_level_histograms(p_level_id)
  );
$$;


ALTER FUNCTION "public"."get_level_histograms_and_summary"("p_level_id" "text", "p_player_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_level_rankings"("p_level_id" "text") RETURNS TABLE("rank" bigint, "player_id" "text", "num_moves" integer, "first_solved_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY num_moves ASC, first_solved_at ASC) AS rank,
    player_id,
    num_moves,
    first_solved_at
  FROM (
    SELECT DISTINCT ON (player_id)
      player_id,
      num_moves,
      created_at    AS first_solved_at
    FROM solutions
    WHERE level_id = p_level_id
    ORDER BY player_id, num_moves ASC, created_at ASC
  ) s
  ORDER BY rank;
$$;


ALTER FUNCTION "public"."get_level_rankings"("p_level_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_level_histograms_and_summary"("p_player_id" "text", "p_level_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'histogram', get_level_histograms(p_level_id),
    'player_summary', get_player_level_summary(p_player_id, p_level_id)
  );
$$;


ALTER FUNCTION "public"."get_player_level_histograms_and_summary"("p_player_id" "text", "p_level_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_level_summary"("p_player_id" "text", "p_level_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
WITH ranks AS (
  SELECT * FROM get_level_rankings(p_level_id)
),
player_row AS (
  SELECT rank, num_moves
  FROM ranks
  WHERE player_id = p_player_id
  LIMIT 1
),
meta AS (
  SELECT
    (SELECT COUNT(*) FROM ranks) AS total,
    (SELECT num_moves FROM ranks WHERE rank = 1 LIMIT 1) AS top_best
)
SELECT
  CASE WHEN meta.total = 0 THEN NULL
  ELSE jsonb_build_object(
    'rank',      player_row.rank,
    'player_best', player_row.num_moves,
    'top_best',
      CASE
        WHEN player_row.rank IS NULL THEN NULL  -- player hasn't solved → hide top_best
        ELSE meta.top_best
      END,
    'total_players',     meta.total
  )
END
FROM meta
LEFT JOIN player_row ON true;
$$;


ALTER FUNCTION "public"."get_player_level_summary"("p_player_id" "text", "p_level_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_purchased_products"("p_user_id" "uuid", "p_email" "text" DEFAULT NULL::"text") RETURNS TABLE("product" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select distinct p.product
  from public.purchases p
  where
    p.user_id = p_user_id
    or (
      p_email is not null
      and p.email = p_email
    );
$$;


ALTER FUNCTION "public"."get_purchased_products"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_level_summary"("p_player_id" "text", "p_level_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
WITH ranks AS (
  SELECT * FROM get_level_rankings(p_level_id)
),
user_row AS (
  SELECT rank, num_moves
  FROM ranks
  WHERE player_id = p_player_id
  LIMIT 1
),
meta AS (
  SELECT
    (SELECT COUNT(*) FROM ranks) AS total,
    (SELECT num_moves FROM ranks WHERE rank = 1 LIMIT 1) AS top_best
)
SELECT
  CASE WHEN meta.total = 0 THEN NULL
  ELSE jsonb_build_object(
    'rank',      user_row.rank,
    'user_best', user_row.num_moves,
    'top_best',
      CASE
        WHEN user_row.rank IS NULL THEN NULL  -- user hasn't solved → hide top_best
        ELSE meta.top_best
      END,
    'total',     meta.total
  )
END
FROM meta
LEFT JOIN user_row ON true;
$$;


ALTER FUNCTION "public"."get_user_level_summary"("p_player_id" "text", "p_level_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_inserted_row jsonb;
  v_histogram jsonb;
  v_player_summary jsonb;
  v_combined jsonb;
BEGIN
  -- Insert the solution
  INSERT INTO solutions (player_id, level_id, solution, num_moves)
  VALUES (p_player_id, p_level_id, p_solution, p_num_moves)
  RETURNING to_jsonb(solutions.*) INTO v_inserted_row;

  -- Get histogram and player summary together
  SELECT get_player_level_histograms_and_summary(p_player_id, p_level_id) INTO v_combined;
  v_histogram := v_combined->'histogram';
  v_player_summary := v_combined->'player_summary';

  -- Return the inserted row, histogram, and player summary
  RETURN jsonb_build_object(
    'solution', v_inserted_row,
    'histogram', v_histogram,
    'player_summary', v_player_summary
  );
END;
$$;


ALTER FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer, "p_contest_hashid" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_inserted_row jsonb;
  v_histogram jsonb;
  v_player_summary jsonb;
  v_combined jsonb;
BEGIN
  -- Insert the solution
  INSERT INTO solutions (player_id, level_id, solution, num_moves, contest)
  VALUES (p_player_id, p_level_id, p_solution, p_num_moves, 
    CASE 
      WHEN p_contest_hashid IS NOT NULL THEN decode_contest_hashid(p_contest_hashid)
      ELSE NULL
    END)
  RETURNING to_jsonb(solutions.*) INTO v_inserted_row;

  -- Get histogram and player summary together
  SELECT get_player_level_histograms_and_summary(p_player_id, p_level_id) INTO v_combined;
  v_histogram := v_combined->'histogram';
  v_player_summary := v_combined->'player_summary';

  -- Return the inserted row, histogram, and player summary
  RETURN jsonb_build_object(
    'solution', v_inserted_row,
    'histogram', v_histogram,
    'player_summary', v_player_summary
  );
END;
$$;


ALTER FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer, "p_contest_hashid" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_solution_and_get_histogram_2"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_inserted_row jsonb;
  v_histogram jsonb;
  v_player_summary jsonb;
  v_combined jsonb;
BEGIN
  -- Insert the solution
  INSERT INTO solutions (player_id, level_id, solution, num_moves)
  VALUES (p_player_id, p_level_id, p_solution, p_num_moves)
  RETURNING to_jsonb(solutions.*) INTO v_inserted_row;

  -- Get histogram and player summary together
  SELECT get_level_histograms_and_summary(p_level_id, p_player_id) INTO v_combined;
  v_histogram := v_combined->'histogram';
  v_player_summary := v_combined->'player_summary';

  -- Return the inserted row, histogram, and player summary
  RETURN jsonb_build_object(
    'solution', v_inserted_row,
    'histogram', v_histogram,
    'player_summary', v_player_summary
  );
END;
$$;


ALTER FUNCTION "public"."insert_solution_and_get_histogram_2"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_participant_name"("p_contest_hashid" "text", "p_player_id" "text", "p_name" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  INSERT INTO participants (contest, player_id, name)
  VALUES (
    decode_contest_hashid(p_contest_hashid),
    p_player_id,
    p_name
  )
  ON CONFLICT (contest, player_id) DO UPDATE
  SET name = EXCLUDED.name;
$$;


ALTER FUNCTION "public"."submit_participant_name"("p_contest_hashid" "text", "p_player_id" "text", "p_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "running" boolean NOT NULL,
    "creator" "uuid" DEFAULT "auth"."uid"(),
    "title" "text" NOT NULL
);


ALTER TABLE "public"."contests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_identifier" "text" NOT NULL,
    "data_json" "jsonb" NOT NULL,
    "user_generated" boolean NOT NULL,
    "level_id" "text" NOT NULL
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "contest" bigint,
    "player_id" "text"
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


ALTER TABLE "public"."participants" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "email" "text",
    "product" "text",
    "quantity" bigint,
    "stripe_session_id" "text",
    "line_item_id" "text" NOT NULL
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


ALTER TABLE "public"."purchases" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchases_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."levels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."puzzles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."solutions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level_id" "text" NOT NULL,
    "solution" "jsonb" NOT NULL,
    "player_id" "text" NOT NULL,
    "num_moves" bigint NOT NULL,
    "contest" bigint
);


ALTER TABLE "public"."solutions" OWNER TO "postgres";


ALTER TABLE "public"."solutions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."solutions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."contests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."speed_contests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("level_id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_contest_player_key" UNIQUE ("contest", "player_id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_line_item_id_key" UNIQUE ("line_item_id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "puzzles_puzzle_id_key" UNIQUE ("full_identifier");



ALTER TABLE ONLY "public"."solutions"
    ADD CONSTRAINT "solutions_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."solutions"
    ADD CONSTRAINT "solutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "speed_contests_pkey" PRIMARY KEY ("id");



CREATE INDEX "solutions_level_id_player_id_num_moves_created_at_idx" ON "public"."solutions" USING "btree" ("level_id", "player_id", "num_moves", "created_at");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_creator_fkey" FOREIGN KEY ("creator") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_contest_fkey" FOREIGN KEY ("contest") REFERENCES "public"."contests"("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."solutions"
    ADD CONSTRAINT "solutions_contest_fkey" FOREIGN KEY ("contest") REFERENCES "public"."contests"("id");



ALTER TABLE ONLY "public"."solutions"
    ADD CONSTRAINT "solutions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("level_id");



CREATE POLICY "Allow Paul to insert" ON "public"."levels" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = '93a71ab1-5e44-40cd-9058-5e079591011d'::"uuid"));



CREATE POLICY "Enable users to view their own data only" ON "public"."purchases" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."contests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solutions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "readonly_role";






















































































































































GRANT ALL ON FUNCTION "public"."decode_contest_hashid"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decode_contest_hashid"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decode_contest_hashid"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encode_contest_hashid"("p_hashid" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."encode_contest_hashid"("p_hashid" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."encode_contest_hashid"("p_hashid" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_hashid" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_hashid" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contest_leaderboard"("p_contest_hashid" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_level_histograms"("p_level_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_level_histograms"("p_level_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_level_histograms"("p_level_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_level_histograms_and_summary"("p_level_id" "text", "p_player_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_level_histograms_and_summary"("p_level_id" "text", "p_player_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_level_histograms_and_summary"("p_level_id" "text", "p_player_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_level_rankings"("p_level_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_level_rankings"("p_level_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_level_rankings"("p_level_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_level_histograms_and_summary"("p_player_id" "text", "p_level_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_level_histograms_and_summary"("p_player_id" "text", "p_level_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_level_histograms_and_summary"("p_player_id" "text", "p_level_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_level_summary"("p_player_id" "text", "p_level_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_level_summary"("p_player_id" "text", "p_level_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_level_summary"("p_player_id" "text", "p_level_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_purchased_products"("p_user_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_purchased_products"("p_user_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_purchased_products"("p_user_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_level_summary"("p_player_id" "text", "p_level_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_level_summary"("p_player_id" "text", "p_level_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_level_summary"("p_player_id" "text", "p_level_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_decode"("text", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_decode"("text", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hash_decode"("text", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_decode"("text", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_encode"(bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_encode"(bigint, "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode"("text", "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode_once"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_decode_once"("text", "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[]) TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint[], "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."id_encode"(bigint, "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer, "p_contest_hashid" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer, "p_contest_hashid" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer, "p_contest_hashid" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram_2"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram_2"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_solution_and_get_histogram_2"("p_player_id" "text", "p_level_id" "text", "p_solution" "jsonb", "p_num_moves" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_participant_name"("p_contest_hashid" "text", "p_player_id" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_participant_name"("p_contest_hashid" "text", "p_player_id" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_participant_name"("p_contest_hashid" "text", "p_player_id" "text", "p_name" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."contests" TO "anon";
GRANT ALL ON TABLE "public"."contests" TO "authenticated";
GRANT ALL ON TABLE "public"."contests" TO "service_role";
GRANT SELECT ON TABLE "public"."contests" TO "readonly_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";
GRANT SELECT ON TABLE "public"."levels" TO "readonly_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";
GRANT SELECT ON TABLE "public"."participants" TO "readonly_role";



GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";
GRANT SELECT ON TABLE "public"."purchases" TO "readonly_role";



GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchases_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."puzzles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."puzzles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."puzzles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."solutions" TO "anon";
GRANT ALL ON TABLE "public"."solutions" TO "authenticated";
GRANT ALL ON TABLE "public"."solutions" TO "service_role";
GRANT SELECT ON TABLE "public"."solutions" TO "readonly_role";



GRANT ALL ON SEQUENCE "public"."solutions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."solutions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."solutions_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."speed_contests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."speed_contests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."speed_contests_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "readonly_role";































