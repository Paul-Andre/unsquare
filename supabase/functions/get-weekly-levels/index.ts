// get-weekly-levels/index.ts
// Stub implementation for weekly levels API

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Calculate the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(now);
    
    // Adjust to get Monday as start of week
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekStart = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Return stub weekly levels data
    const stubLevels = [
      {
        id: "weekly_stub_1",
        week_start: weekStart,
        title: "Weekly Challenge - Stub 1",
        description: "This is a stub weekly level",
        difficulty: "expert",
        grid_size: "10x10",
        created_at: new Date().toISOString()
      },
      {
        id: "weekly_stub_2",
        week_start: weekStart,
        title: "Weekly Challenge - Stub 2",
        description: "Another stub weekly level",
        difficulty: "master",
        grid_size: "12x12",
        created_at: new Date().toISOString()
      },
      {
        id: "weekly_stub_3",
        week_start: weekStart,
        title: "Weekly Challenge - Stub 3",
        description: "Third stub weekly level",
        difficulty: "legendary",
        grid_size: "15x15",
        created_at: new Date().toISOString()
      }
    ];

    return new Response(
      JSON.stringify({
        success: true,
        week_start: weekStart,
        levels: stubLevels,
        count: stubLevels.length,
        message: "Stub implementation - replace with actual database query"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-weekly-levels:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
        message: "Failed to fetch weekly levels"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});