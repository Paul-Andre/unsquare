---
inclusion: always
---

# React Migration Steering Document

## Current Architecture Overview

### Technology Stack
- **Build Tool**: Vite with TypeScript
- **UI Framework**: Vanilla TypeScript with dom-chef for JSX-like syntax (limited to a few components)
- **State Management**: Class-based with manual DOM manipulation
- **Canvas Rendering**: Direct Canvas API usage for game rendering
- **Backend**: Supabase for auth, database, and edge functions
- **Payment**: Stripe integration via Supabase edge functions

### Application Structure

The app follows a modular architecture organized into:

```
web/src/
├── modules/
│   ├── core/          # Core game logic and data models
│   ├── game/          # Game and editor implementations
│   ├── ui/            # UI screens and components
│   └── utils/         # Utilities (auth, API, analytics, etc.)
├── data/              # Level data (JSON files)
└── main.ts            # Entry point
```

### Key Architectural Patterns

#### 1. Screen Management
- **ScreenManager** class handles navigation between screens
- Screens are HTML sections with `variant_shown` class toggling
- Stack-based navigation with back button support
- Lifecycle hooks: `onShow()` and `onHide()`

#### 2. AppContext Singleton
- Central coordination point for all major components
- Holds references to: Game, Editor, ScreenManager, and all menu screens
- Exposed globally as `window.appContext`
- Handles navigation between different app sections

#### 3. Game State Management
- **GameBase** abstract class provides core game mechanics
- **Game** class extends GameBase with gameplay-specific logic
- **Editor** class extends GameBase with level editing logic
- State stored in class properties with manual updates
- Undo/redo system with state snapshots

#### 4. DOM Manipulation Patterns
- Direct DOM queries using `getElementById`, `querySelector`
- Manual element creation and manipulation
- Event listeners attached in constructors
- Some components use dom-chef for JSX-like syntax (AuthModal, Leaderboard components)

#### 5. Data Flow
- Level data loaded from JSON files
- LocalStorage for user progress and settings
- Supabase for authentication and challenge statistics
- No formal state management library

### Current React Usage

React is already installed but minimally used:
- **AuthModal.tsx**: Uses dom-chef (JSX) to create modal structure
- **Leaderboard components**: Use dom-chef for rendering
- **Pattern**: JSX used for initial structure, then manual DOM manipulation for updates

### Key Components to Migrate

#### High Priority (UI-heavy)
1. **Screen Components**
   - MainLevelMenuScreen
   - ChallengeLevelMenuScreen
   - GridLevelMenuScreen
   - BookMenuScreen
   - EditorLevelMenuScreen
   - OpeningInstructionsScreen

2. **Modal Components**
   - AuthModal (already uses JSX)
   - DailyWeeklyArchiveOfferModal
   - RedirectingToPaymentModal
   - JsonModal

3. **Reusable UI Components**
   - LevelIcon
   - LevelIconGrid
   - ChallengeHistogram
   - WeeklyChallengeCard
   - UnlockAllSection

#### Medium Priority (Mixed logic/UI)
4. **Game UI Elements**
   - Game header/controls
   - Finished level overlays
   - Histogram views
   - Navigation buttons

#### Low Priority (Keep as-is initially)
5. **Core Game Logic**
   - GameBase, Game, Editor classes (heavy Canvas API usage)
   - Drawing functions
   - Level/Grid/Book data models
   - Algorithm utilities

## Migration Strategy

### Phase 1: Foundation (Recommended First)
1. **Set up React Router** for screen navigation
2. **Create React context** for AppContext replacement
3. **Migrate ScreenManager** to React Router
4. **Convert one simple screen** as proof of concept (e.g., OpeningInstructionsScreen)

### Phase 2: UI Components
1. Convert modal components (already partially using JSX)
2. Convert reusable UI components (LevelIcon, etc.)
3. Convert menu screens one by one
4. Implement proper state management (Context API or Zustand)

### Phase 3: Game Integration
1. Wrap Game/Editor canvas components in React
2. Convert game UI overlays to React
3. Integrate game state with React state management
4. Handle lifecycle properly (mount/unmount canvas)

### Phase 4: Refinement
1. Add proper TypeScript types throughout
2. Optimize re-renders
3. Add proper error boundaries
4. Improve accessibility
5. Clean up legacy code

## Key Considerations

### Canvas Rendering
- **Keep Canvas API usage**: Game and Editor use direct Canvas API - don't migrate this
- **Wrap in React components**: Create React wrappers that manage canvas lifecycle
- **Use refs**: Access canvas elements via React refs
- **Separate concerns**: Keep rendering logic separate from React state

### State Management Options
1. **Context API**: Good for global state (user, auth, current level)
2. **Zustand**: Lightweight, good for game state
3. **Local state**: Use useState/useReducer for component-specific state
4. **Keep LocalStorage**: Continue using for persistence

### Routing Strategy
- Use React Router for main navigation
- Map current screens to routes:
  - `/` → MainLevelMenu
  - `/game/:levelId` → Game
  - `/editor/:levelId?` → Editor
  - `/challenges` → ChallengeLevelMenu
  - `/daily` → GridLevelMenu
  - `/books` → BookMenu

### Backward Compatibility
- Keep `window.appContext` during migration for gradual transition
- Maintain existing event listeners until fully migrated
- Keep LocalStorage keys unchanged
- Preserve URL structure for shared levels

### Testing Strategy
- Test each migrated component in isolation
- Verify game mechanics remain unchanged
- Test on mobile devices (touch events critical)
- Verify offline PWA functionality
- Test payment flows thoroughly

## Common Patterns to Replace

### Pattern 1: Screen Switching
**Before:**
```typescript
appContext.screenManager.switchTo("game");
```

**After:**
```typescript
navigate("/game");
```

### Pattern 2: DOM Queries
**Before:**
```typescript
const element = document.getElementById("gameCanvas");
element.classList.add("showing");
```

**After:**
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);
// Use ref in JSX: <canvas ref={canvasRef} />
```

### Pattern 3: Manual State Updates
**Before:**
```typescript
this.numMoves = 0;
this.updateMovesDisplay();
```

**After:**
```typescript
const [numMoves, setNumMoves] = useState(0);
// React automatically re-renders
```

### Pattern 4: Event Listeners
**Before:**
```typescript
button.addEventListener("click", () => this.handleClick());
```

**After:**
```typescript
<button onClick={handleClick}>Click</button>
```

## File Organization Recommendations

```
web/src/
├── components/          # React components
│   ├── screens/        # Screen-level components
│   ├── game/           # Game-related components
│   ├── modals/         # Modal components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── core/               # Core game logic (keep as-is)
├── utils/              # Utilities (keep as-is)
├── data/               # Level data (keep as-is)
└── App.tsx             # Main app component
```

## Performance Considerations

1. **Memoization**: Use React.memo for expensive components (level icons)
2. **Virtualization**: Consider for long level lists
3. **Canvas optimization**: Keep existing optimizations
4. **Code splitting**: Use React.lazy for routes
5. **Bundle size**: Monitor impact of React on bundle size

## Accessibility Improvements

During migration, improve:
1. Keyboard navigation
2. Screen reader support
3. Focus management
4. ARIA labels
5. Color contrast

## Migration Checklist

- [ ] Set up React Router
- [ ] Create AppContext replacement (React Context)
- [ ] Migrate ScreenManager to routing
- [ ] Convert OpeningInstructionsScreen (proof of concept)
- [ ] Convert modal components
- [ ] Convert reusable UI components
- [ ] Convert menu screens
- [ ] Wrap Game component
- [ ] Wrap Editor component
- [ ] Migrate game UI overlays
- [ ] Set up proper state management
- [ ] Add TypeScript types
- [ ] Test on mobile devices
- [ ] Test offline functionality
- [ ] Test payment flows
- [ ] Remove legacy code
- [ ] Update documentation

## Resources

- Current codebase uses Vite + TypeScript (already configured)
- React and React DOM already installed (v19.2.3)
- dom-chef can be gradually phased out
- Existing CSS can be reused initially

## Notes

- The app is a PWA - ensure service worker continues to work
- Touch events are critical for mobile gameplay
- Canvas performance is critical - don't break it
- Level sharing via URL must continue to work
- LocalStorage keys should remain unchanged for user data
