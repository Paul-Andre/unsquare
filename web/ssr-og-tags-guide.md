# Server-Side Rendering for Open Graph Metadata

## Problem
Custom level sharing URLs need proper Open Graph tags (og:image, og:title, og:description) for social media previews, but the current SPA can't generate these dynamically.

## Lightweight SSR Solutions

### Option 1: Edge Function Middleware (Recommended)
Use Supabase Edge Functions or Cloudflare Workers to intercept requests and inject OG tags.

**Pros:**
- No changes to main app architecture
- Works with existing Vite build
- Minimal latency (edge computing)
- Already using Supabase

**Implementation:**
```typescript
// supabase/functions/og-handler/index.ts
Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Check if it's a level share URL
  const levelMatch = url.searchParams.get('level');
  
  if (levelMatch && isBot(req.headers.get('user-agent'))) {
    // Parse level data from URL
    const levelData = parseLevelFromUrl(levelMatch);
    
    // Generate level preview image (or use cached)
    const imageUrl = await generateLevelPreview(levelData);
    
    // Fetch the base HTML
    const html = await fetch('https://unflipgame.com/index.html');
    const htmlText = await html.text();
    
    // Inject OG tags
    const modifiedHtml = injectOGTags(htmlText, {
      title: `Unflip - Custom Level`,
      description: `Try this ${levelData.size}x${levelData.size} puzzle!`,
      image: imageUrl,
      url: req.url
    });
    
    return new Response(modifiedHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Pass through to static site
  return fetch(req);
});
```

**Deployment:**
- Deploy edge function
- Configure DNS/routing to route through edge function
- Cache generated images in Supabase Storage

### Option 2: Vite SSR Plugin (Partial SSR)
Add minimal SSR only for metadata generation while keeping the app as SPA.

**Pros:**
- Integrated with Vite
- Can use React components for OG image generation
- Type-safe with existing codebase

**Implementation:**
```typescript
// server/ssr-handler.ts
import { renderToString } from 'react-dom/server';
import { generateLevelPreview } from './level-preview';

export async function handleSSR(url: string) {
  const levelParam = new URL(url).searchParams.get('level');
  
  if (levelParam) {
    const levelData = parseLevelFromUrl(levelParam);
    const imageUrl = await generateLevelPreview(levelData);
    
    return {
      ogTags: {
        title: `Unflip - Custom Level`,
        description: `${levelData.size}x${levelData.size} puzzle`,
        image: imageUrl,
        url: url
      }
    };
  }
  
  return null;
}
```

**Vite config:**
```typescript
// vite.config.ts
export default {
  plugins: [
    {
      name: 'og-ssr',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.includes('level=') && isBot(req.headers['user-agent'])) {
            const ogData = await handleSSR(req.url);
            if (ogData) {
              const html = await fs.readFile('index.html', 'utf-8');
              const modifiedHtml = injectOGTags(html, ogData.ogTags);
              res.end(modifiedHtml);
              return;
            }
          }
          next();
        });
      }
    }
  ]
}
```

### Option 3: Prerender Service (External)
Use a service like Prerender.io or build a simple Node.js service.

**Pros:**
- No changes to deployment
- Can be added/removed easily
- Handles all bot detection

**Implementation:**
- Set up prerender service
- Configure nginx/CDN to route bot traffic to prerender
- Prerender service fetches your SPA, executes JS, returns HTML

### Option 4: React Router SSR (Full Migration)
If migrating to React Router, add SSR support.

**Pros:**
- Full SSR capabilities
- Better SEO overall
- Can use React Server Components (future)

**Cons:**
- Requires Node.js server or edge runtime
- More complex deployment
- Need to handle hydration

**Implementation:**
```typescript
// server/entry-server.tsx
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

export function render(url: string, ogData?: OGData) {
  return renderToPipeableStream(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );
}
```

## Recommended Approach

**For your use case (custom level sharing):**

1. **Start with Option 1 (Edge Function)** - Minimal changes, works immediately
2. **Generate level preview images** server-side:
   - Use Canvas API in Deno/Node to render level preview
   - Cache in Supabase Storage with level hash as key
   - Serve via CDN

3. **Bot detection:**
```typescript
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const bots = [
    'facebookexternalhit',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'WhatsApp',
    'Discordbot',
    'TelegramBot'
  ];
  return bots.some(bot => userAgent.includes(bot));
}
```

4. **Level preview generation:**
```typescript
// Generate preview image from level data
async function generateLevelPreview(levelData: Level): Promise<string> {
  const cacheKey = `level-preview-${levelData.hash}`;
  
  // Check cache first
  const cached = await supabase.storage
    .from('level-previews')
    .getPublicUrl(cacheKey);
  
  if (cached) return cached.data.publicUrl;
  
  // Generate new preview using Canvas
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext('2d');
  
  // Draw level grid (reuse your existing drawing logic)
  drawLevelPreview(ctx, levelData);
  
  // Upload to storage
  const buffer = canvas.toBuffer('image/png');
  await supabase.storage
    .from('level-previews')
    .upload(cacheKey, buffer);
  
  return cached.data.publicUrl;
}
```

## Migration Path

1. **Phase 1**: Add edge function for OG tags (no app changes)
2. **Phase 2**: Migrate to React (still SPA)
3. **Phase 3**: If needed, add React Router SSR later

This keeps your app as a fast SPA while solving the social sharing problem.

## Implementation Checklist

- [ ] Create Supabase Edge Function for OG tag injection
- [ ] Implement bot detection logic
- [ ] Create level preview image generator (server-side Canvas)
- [ ] Set up Supabase Storage bucket for level previews
- [ ] Implement caching strategy (hash-based keys)
- [ ] Add OG tag injection logic
- [ ] Configure DNS/routing to use edge function
- [ ] Test with Facebook, Twitter, Discord link previews
- [ ] Monitor edge function performance and costs
- [ ] Add fallback for edge function failures

## Testing

Test OG tags with these tools:
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- Discord: Just paste the link in any channel

## Notes

- Edge functions are billed by invocations and compute time
- Cache aggressively to minimize costs
- Consider rate limiting for preview generation
- Monitor storage costs for cached images
- Set up CDN caching headers for preview images
