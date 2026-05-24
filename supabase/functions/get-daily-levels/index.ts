// get-daily-levels/index.ts
// Stub implementation for daily levels API

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
    // Get the date for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Return stub daily levels data
    const stubLevels = [
      {
        id: "daily_stub_1",
        date: today,
        title: "Daily Challenge - Stub",
        description: "This is a stub daily level",
        difficulty: "medium",
        grid_size: "7x7",
        created_at: new Date().toISOString()
      },
      {
        id: "daily_stub_2", 
        date: today,
        title: "Daily Challenge - Stub 2",
        description: "Another stub daily level",
        difficulty: "hard",
        grid_size: "9x9",
        created_at: new Date().toISOString()
      }
    ];

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
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
    console.error("Error in get-daily-levels:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
        message: "Failed to fetch daily levels"
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