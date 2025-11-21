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
