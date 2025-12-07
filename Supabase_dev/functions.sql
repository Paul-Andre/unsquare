
-- CREATE ROLE readonly_role;
-- GRANT USAGE ON SCHEMA public TO readonly_role;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;


CREATE OR REPLACE FUNCTION get_level_histograms(p_level_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
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

CREATE OR REPLACE FUNCTION get_player_level_histograms_and_summary(
  p_player_id text,
  p_level_id text
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'histogram', get_level_histograms(p_level_id),
    'player_summary', get_player_level_summary(p_player_id, p_level_id)
  );
$$;

CREATE OR REPLACE FUNCTION insert_solution_and_get_histogram(
  p_player_id text,
  p_level_id text,
  p_solution jsonb,
  p_num_moves integer
)
RETURNS jsonb
LANGUAGE plpgsql
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


CREATE OR REPLACE FUNCTION get_level_rankings(p_level_id text)
RETURNS TABLE (
  rank bigint,
  player_id text,
  num_moves integer,
  first_solved_at timestamptz
)
LANGUAGE sql
STABLE
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

CREATE OR REPLACE FUNCTION get_player_level_summary(
  p_player_id text,
  p_level_id  text
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- TODO: figure out how to use the readonly_role
ALTER FUNCTION get_player_level_summary(text,text) OWNER TO postgres;
ALTER FUNCTION get_player_level_histograms_and_summary(text,text) OWNER TO postgres;