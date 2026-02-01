// validate-and-save-solution/index.ts
// Supabase Edge Function (Deno) — Validate a puzzle solution and save it to Postgres via REST.
// Self-contained version with embedded validation logic.

// @ts-ignore: Deno is available in Supabase Edge Function runtime
declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// ============================================================================
// Embedded validation code (minimal subset from algo.js)
// ============================================================================

function vector_equal(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function vector_apply_modulus(vector: number[], modulus: number): void {
  for (let i = 0; i < vector.length; i++) {
    vector[i] %= modulus;
    vector[i] += modulus;
    vector[i] %= modulus;
  }
}

function vector_simplify_arithmetic(vector: number[], arithmetic: { type: string; modulus?: number }): void {
  if (arithmetic.type === "modular" && arithmetic.modulus) {
    vector_apply_modulus(vector, arithmetic.modulus);
  }
}

function compute_operations(geometry: { type: string; width: number; height: number }): number[][] {
  if (geometry.type !== "square") {
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
  const operations: number[][] = [];
  const w = geometry.width;
  const h = geometry.height;
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      for (let s = 2; i + s <= w && j + s <= h; s++) {
        const arr = new Array(w * h).fill(0);
        for (let ii = 0; ii < s; ii++) {
          for (let jj = 0; jj < s; jj++) {
            const x = i + ii;
            const y = j + jj;
            arr[x + y * w] = 1;
          }
        }
        operations.push(arr);
      }
    }
  }
  return operations;
}

function compute_operations_for_level(level: { tiles: { width: number; height: number }; tileShape: { name: string } }): number[][] {
  if (level.tileShape.name === "square") {
    return compute_operations({
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    });
  }
  throw new Error(`Unsupported tile shape: ${level.tileShape.name}`);
}

function vector_multiply_matrix(applications: number[], operations: number[][], arithmetic?: { type: string; modulus?: number }): number[] {
  const m = applications.length;
  if (operations.length !== m) {
    throw new Error("Mismatch between applications and operations length");
  }
  const n = operations[0].length;
  const ret = new Array(n).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      ret[j] += applications[i] * operations[i][j];
    }
    if (arithmetic) {
      vector_simplify_arithmetic(ret, arithmetic);
    }
  }
  return ret;
}

function get_level_tiles_vector(level: { tiles: { array: number[] } }): number[] {
  const tilesVector = level.tiles.array.slice();
  for (let i = 0; i < tilesVector.length; i++) {
    tilesVector[i] -= 1;
  }
  return tilesVector;
}

function level_get_arithmetic(level: { colorScheme: { arithmetic: { type: string; modulus?: number } } }): { type: string; modulus?: number } {
  return level.colorScheme.arithmetic;
}

function level_check_solution(level: { tiles: { array: number[]; width: number; height: number }; tileShape: { name: string }; colorScheme: { arithmetic: { type: string; modulus?: number } } }, solution: number[]): boolean {
  const target = get_level_tiles_vector(level);
  const operations = compute_operations_for_level(level);
  const arithmetic = level_get_arithmetic(level);
  const reach = vector_multiply_matrix(solution, operations, arithmetic);
  return vector_equal(target, reach);
}

function vector_sum(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
  }
  return sum;
}

// ============================================================================
// Level object builder from JSON
// ============================================================================

interface LevelData {
  tiles: number[][];
  colorScheme?: string;
  tileShape?: string;
  [key: string]: any;
}

function buildLevelFromJson(json: LevelData): { tiles: { array: number[]; width: number; height: number }; tileShape: { name: string }; colorScheme: { arithmetic: { type: string; modulus: number } } } {
  // Convert 2D tiles array to flat array
  const height = json.tiles.length;
  const width = json.tiles[0]?.length || 0;
  const flatTiles: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      flatTiles.push(json.tiles[y][x]);
    }
  }

  // Determine color scheme and arithmetic
  // Default to BW (mod 2) if not specified
  const colorSchemeName = json.colorScheme || "BW";
  let arithmetic: { type: string; modulus: number };
  if (colorSchemeName === "BW") {
    arithmetic = { type: "modular", modulus: 2 };
  } else if (colorSchemeName === "tri") {
    arithmetic = { type: "modular", modulus: 3 };
  } else {
    // Default to mod 2 for unknown schemes
    arithmetic = { type: "modular", modulus: 2 };
  }

  // Determine tile shape (default to square)
  const tileShapeName = json.tileShape || "square";

  return {
    tiles: {
      array: flatTiles,
      width: width,
      height: height,
    },
    tileShape: {
      name: tileShapeName,
    },
    colorScheme: {
      arithmetic: arithmetic,
    },
  };
}

// ============================================================================
// Helper functions
// ============================================================================

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function errorResponse(message: string, status: number = 400, details?: unknown): Response {
  const response: { error: string; details?: unknown } = { error: message };
  if (details !== undefined) {
    response.details = details;
  }
  return jsonResponse(response, status);
}

function parseSolution(solution: unknown): number[] {
  if (typeof solution === "string") {
    try {
      const parsed = JSON.parse(solution);
      if (!Array.isArray(parsed)) {
        throw new Error("Solution must be a JSON array");
      }
      return parsed;
    } catch (e) {
      throw new Error("Invalid solution format: must be valid JSON array");
    }
  }
  if (Array.isArray(solution)) {
    return solution;
  }
  throw new Error("Solution must be a JSON array or JSON string");
}

async function supabaseFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Server misconfiguration: missing SUPABASE_URL or SERVICE_ROLE_KEY");
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, "");
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}/rest/v1${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      ...options.headers,
    },
  });
}

interface RequestBody {
  player_id: string;
  level_id: string;
  solution: unknown;
  contest_hashid?: string;
}

// Sanity check:
{
    const level_json = {
        tiles: [
            [2, 1, 1],
            [1, 2, 1],
            [1, 1, 2]
        ],
        colorScheme: "BW",
        tileShape: "square"
    }
    const level = buildLevelFromJson(level_json);
    const solution = [ 0, 1, 1, 3, 0 ]
    if (level_check_solution(level, solution)) {
        console.log("Solution passed validation");
    } else {
        console.error("Solution failed validation");
        Deno.exit(1);
    }

}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return errorResponse("Request must be application/json");
    }

    // TODO: better parsing/validation
    const body = await req.json().catch(() => null) as RequestBody | null;
    if (!body?.player_id || !body?.level_id || body.solution === undefined) {
      return errorResponse("Missing or invalid fields: player_id, level_id, solution are required");
    }

    let solutionArray: number[];
    try {
      solutionArray = parseSolution(body.solution);
    } catch (e) {
      return errorResponse(e instanceof Error ? e.message : "Invalid solution format");
    }

    // If part of a contest, check if the contest is still running

    if (body.contest_hashid) {
      // Decode the hashid using an rpc call to decode_contest_hashid
      const contestResp = await supabaseFetch(`/rpc/decode_contest_hashid`, {
        method: "POST",
        body: JSON.stringify({ p_id: body.contest_hashid })
      });
      if (!contestResp.ok) {
        return errorResponse("Failed to decode contest hashid", contestResp.status, `HTTP ${contestResp.status}`);
      }
      const contestData = Number(await contestResp.json().catch(() => null));
      console.log("Decoded contest data:", contestData);
      if (!contestData) {
        return errorResponse("Invalid contest hashid", 400);
      }

      // Fetch contest details
      const contestDetailsResp = await supabaseFetch(`/contests?id=eq.${encodeURIComponent(contestData)}&select=running`);
      if (!contestDetailsResp.ok) {
        return errorResponse("Failed to fetch contest details", contestDetailsResp.status, `HTTP ${contestDetailsResp.status}`);
      }
      const contestDetails = await contestDetailsResp.json().catch(() => null) as Array<{ running: boolean }>;
      if (!Array.isArray(contestDetails) || contestDetails.length === 0) {
        return errorResponse("Contest not found", 404);
      }
      if (!contestDetails[0].running) {
        return errorResponse("Contest is not running", 403);
      }
    }
    // Fetch level data from Supabase
    const levelResp = await supabaseFetch(
      `/levels?level_id=eq.${encodeURIComponent(body.level_id)}&select=data_json`
    );

    if (!levelResp.ok) {
      return errorResponse("Failed to fetch level", levelResp.status, `HTTP ${levelResp.status}`);
    }

    const levelRows = await levelResp.json() as Array<{ data_json: LevelData }>;
    if (!Array.isArray(levelRows) || levelRows.length === 0) {
      return errorResponse("Level not found", 404);
    }

    const levelData = levelRows[0].data_json;
    if (!levelData) {
      return errorResponse("Level data_json is missing or invalid", 500);
    }

    let level;
    try {
      level = buildLevelFromJson(levelData);
    } catch (err) {
      return errorResponse(
        "Error building level from data_json",
        500,
        err instanceof Error ? err.message : String(err)
      );
    }

    // Validate solution
    try {
      if (!level_check_solution(level, solutionArray)) {
        return jsonResponse({ valid: false, error: "Solution failed validation" }, 422);
      }
    } catch (err) {
      return errorResponse(
        "Validation error",
        422,
        err instanceof Error ? err.message : String(err)
      );
    }

    // Insert solution and get histogram in one call
    const insertResp = await supabaseFetch("/rpc/insert_solution_and_get_histogram", {
      method: "POST",
      body: JSON.stringify({
        p_player_id: body.player_id,
        p_level_id: body.level_id,
        p_solution: solutionArray,
        p_num_moves: vector_sum(solutionArray),
        p_contest_hashid: body.contest_hashid ?? null
      })
    });

    if (!insertResp.ok) {
      const errorResult = await insertResp.json().catch(() => ({}));
      return errorResponse("Insert failed", insertResp.status || 500, errorResult);
    }

    const responseData = await insertResp.json().catch(() => null);
    if (!responseData) {
      return errorResponse("Failed to parse response", 500);
    }

    return jsonResponse({ 
      valid: true, 
      saved: true, 
      result: responseData.solution,
      allHistogramData: responseData.histogram,
      player_summary: responseData.player_summary
    }, 201);

  } catch (err) {
    console.error("Unhandled error in validate-and-save-solution:", err);
    return errorResponse(
      "Internal server error",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});
