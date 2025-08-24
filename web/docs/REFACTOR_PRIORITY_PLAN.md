# Unflip Refactor Priority Plan - Velocity Focused

## Executive Summary

This document prioritizes refactoring efforts specifically to increase development velocity for new features and user feedback iteration. The goal is maximum impact with minimal time investment.

## Planned Features Analysis

### Immediate Features (Next 2-3 months):
- Tutorial system with animated instruction screens
- Enhanced level completion animations
- Settings screen
- Internationalization (English/French)
- UI/UX improvements
- Interstitial screens between levels
- Multiple level packs
- Backend for level sharing with Open Graph
- Mobile app version
- Monetization system

### Advanced Features (3-6 months):
- Hint system with algorithmic backend
- Move tracking and distribution analytics
- Theming system
- Multiple tile types
- Non-square tile shapes

## Priority Assessment Framework

**High Impact, Low Effort** = Do First
**High Impact, Medium Effort** = Do Second  
**Medium Impact, Low Effort** = Do Third
**Low Impact, Any Effort** = Skip for now

## Phase 1: Critical Infrastructure for Planned Features (Week 1-2)

### 1.1 Module System & Import/Export (High Impact, Medium Effort)

**Why Critical for Velocity:**
- **Tutorial system:** Need clean separation between tutorial logic and game logic
- **Multiple level packs:** Need modular level loading system
- **Settings/UI:** Need isolated UI components
- **Internationalization:** Need language module system

**Implementation:**
```javascript
// Convert to ES6 modules
// tutorial/TutorialManager.js
export class TutorialManager {
  constructor() {
    this.screens = [];
    this.currentScreen = 0;
  }
}

// levels/LevelPackManager.js
export class LevelPackManager {
  constructor() {
    this.packs = new Map();
  }
}

// ui/SettingsManager.js
export class SettingsManager {
  constructor() {
    this.settings = new Map();
  }
}

// i18n/LocalizationManager.js
export class LocalizationManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = new Map();
  }
}
```

**Time Investment:** 3-4 days
**Velocity Gain:** Critical for all planned features

### 1.2 State Management System (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Tutorial system:** Need to track tutorial progress
- **Settings:** Need persistent settings state
- **Level packs:** Need to track current pack and progress
- **Analytics:** Need to track user actions

**Implementation:**
```javascript
// state/GameStateManager.js
export class GameStateManager {
  constructor() {
    this.state = {
      tutorial: { completed: false, currentStep: 0 },
      settings: { language: 'en', sound: true, theme: 'default' },
      progress: { currentPack: 'main', currentLevel: 0 },
      analytics: { moves: [], completions: [] }
    };
  }
}
```

**Time Investment:** 2-3 days
**Velocity Gain:** Essential for tutorial, settings, and analytics

### 1.3 Animation System Refactor (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Tutorial animations:** Need reusable animation system
- **Level completion:** Need enhanced completion animations
- **Interstitials:** Need smooth transitions
- **UI improvements:** Need consistent animation patterns

**Implementation:**
```javascript
// animation/AnimationManager.js
export class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.isPlaying = false;
  }

  playTutorialAnimation(type, target) {
    // Reusable tutorial animations
  }

  playLevelCompleteAnimation(level) {
    // Enhanced completion animations
  }

  playInterstitialAnimation(from, to) {
    // Smooth transitions
  }
}
```

**Time Investment:** 2-3 days
**Velocity Gain:** Critical for tutorial and UI improvements

## Phase 2: Backend & Data Infrastructure (Week 3-4)

### 2.1 API Layer & Data Models (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Level sharing:** Need backend API for level storage
- **Analytics:** Need move tracking and distribution
- **User progress:** Need persistent user data
- **Monetization:** Need user accounts and purchase tracking

**Implementation:**
```javascript
// api/ApiClient.js
export class ApiClient {
  async shareLevel(levelData) {
    // Share level to backend
  }

  async trackMoves(levelId, moves) {
    // Track user moves for analytics
  }

  async getUserProgress() {
    // Get user progress
  }
}

// models/Level.js
export class Level {
  constructor(data) {
    this.id = data.id;
    this.packId = data.packId;
    this.hintData = data.hintData; // For hint system
    this.tileTypes = data.tileTypes; // For multiple tile types
  }
}
```

**Time Investment:** 3-4 days
**Velocity Gain:** Essential for backend features

### 2.2 Level Pack System (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Multiple packs:** Need structured pack management
- **User-created levels:** Need level validation and storage
- **Hint system:** Need to extend level data structure
- **Theming:** Need pack-specific themes

**Implementation:**
```javascript
// levels/LevelPack.js
export class LevelPack {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.levels = data.levels.map(level => new Level(level));
    this.theme = data.theme;
    this.hintData = data.hintData;
  }
}

// levels/LevelValidator.js
export class LevelValidator {
  static validateLevel(level) {
    // Validate user-created levels
  }
}
```

**Time Investment:** 2-3 days
**Velocity Gain:** Essential for multiple packs and user levels

## Phase 3: UI/UX Foundation (Week 5-6)

### 3.1 Component System (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Tutorial screens:** Need reusable UI components
- **Settings screen:** Need form components
- **Interstitials:** Need overlay components
- **Theming:** Need themeable components

**Implementation:**
```javascript
// ui/components/Modal.js
export class Modal {
  constructor(content, options = {}) {
    this.content = content;
    this.options = options;
  }
}

// ui/components/Button.js
export class Button {
  constructor(text, onClick, options = {}) {
    this.text = text;
    this.onClick = onClick;
    this.options = options;
  }
}

// ui/components/ProgressBar.js
export class ProgressBar {
  constructor(current, total) {
    this.current = current;
    this.total = total;
  }
}
```

**Time Investment:** 3-4 days
**Velocity Gain:** Essential for all UI features

### 3.2 Internationalization System (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Tutorial text:** Need translatable tutorial content
- **UI text:** Need translatable interface
- **Settings:** Need language selection
- **Level content:** Need translatable level descriptions

**Implementation:**
```javascript
// i18n/Translations.js
export const TRANSLATIONS = {
  en: {
    tutorial: {
      step1: "Drag from one corner to the other of a square area to flip the tiles.",
      step2: "White tiles flip to black and black tiles flip to white.",
      step3: "Make all tiles white to win."
    },
    settings: {
      language: "Language",
      sound: "Sound",
      theme: "Theme"
    }
  },
  fr: {
    tutorial: {
      step1: "Faites glisser d'un coin à l'autre d'une zone carrée pour retourner les tuiles.",
      step2: "Les tuiles blanches deviennent noires et les tuiles noires deviennent blanches.",
      step3: "Rendez toutes les tuiles blanches pour gagner."
    }
  }
};
```

**Time Investment:** 2-3 days
**Velocity Gain:** Essential for internationalization

## Phase 4: Mobile & Monetization Foundation (Week 7-8)

### 4.1 Responsive Design System (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Mobile app:** Need responsive UI components
- **Touch interactions:** Need touch-friendly controls
- **Monetization UI:** Need mobile-optimized purchase flows

**Implementation:**
```javascript
// ui/ResponsiveManager.js
export class ResponsiveManager {
  constructor() {
    this.isMobile = this.detectMobile();
    this.setupResponsiveBehavior();
  }

  detectMobile() {
    return window.innerWidth <= 768;
  }
}

// ui/TouchManager.js
export class TouchManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.setupTouchHandling();
  }
}
```

**Time Investment:** 2-3 days
**Velocity Gain:** Essential for mobile app

### 4.2 Monetization Infrastructure (High Impact, Medium Effort)

**Why Critical for Planned Features:**
- **Hint purchases:** Need payment processing
- **Rewarded videos:** Need ad integration
- **User accounts:** Need user management
- **Purchase tracking:** Need analytics

**Implementation:**
```javascript
// monetization/PaymentManager.js
export class PaymentManager {
  async purchaseHints(amount) {
    // Process hint purchase
  }

  async showRewardedAd() {
    // Show rewarded video ad
  }
}

// monetization/UserManager.js
export class UserManager {
  constructor() {
    this.user = null;
    this.purchases = [];
  }
}
```

**Time Investment:** 3-4 days
**Velocity Gain:** Essential for monetization

## TypeScript Priority: HIGH

**Why TypeScript is Critical for These Features:**
- **Complex data models:** Level packs, user data, analytics
- **API integration:** Backend communication, payment processing
- **Component system:** UI components, tutorial system
- **Internationalization:** Type-safe translation keys

**Migration Strategy:**
1. **Start with new features** - All new code in TypeScript
2. **Convert critical files first** - GameState, Level, API clients
3. **Gradual conversion** - Convert existing files as you touch them

**Time Investment:** 
- Initial setup: 1 day
- Critical files: 3-4 days
- Ongoing: 0.5-1 day per file

## Updated Implementation Timeline

### Week 1-2: Core Infrastructure
- Module system conversion
- State management system
- Animation system refactor

### Week 3-4: Backend & Data
- API layer & data models
- Level pack system
- TypeScript setup

### Week 5-6: UI/UX Foundation
- Component system
- Internationalization system
- Responsive design

### Week 7-8: Mobile & Monetization
- Touch handling
- Monetization infrastructure
- Mobile optimization

## What to Skip (For Now)

### Skip These Items:
- **Advanced accessibility** - Can be added per feature
- **Performance optimization** - Only if mobile performance becomes an issue
- **Advanced testing** - Focus on critical path testing only
- **Complex build system** - Simple Vite setup is sufficient

### Why Skip:
- These items don't directly support the planned features
- Can be added incrementally as needed
- Focus should be on infrastructure that enables the feature roadmap

## Success Metrics

### Velocity Metrics:
- **Feature development time** - Should decrease by 40-60%
- **Bug fix time** - Should decrease by 60-80%
- **New feature integration time** - Should decrease by 50-70%

### Feature Readiness:
- **Tutorial system** - Ready for implementation
- **Level packs** - Ready for implementation
- **Internationalization** - Ready for implementation
- **Mobile app** - Foundation ready
- **Monetization** - Infrastructure ready

## Risk Mitigation

### Risks:
- **Scope creep** - Mitigation: Stick to this priority list
- **Breaking existing functionality** - Mitigation: Test critical paths thoroughly
- **Mobile performance issues** - Mitigation: Test on real devices early

### Rollback Plan:
- Keep original files as backup
- Implement changes incrementally
- Have clear rollback points for each phase

## Conclusion

This refactor plan is specifically designed to support your feature roadmap. The infrastructure changes will enable rapid development of:

1. **Tutorial system** - Animation and state management ready
2. **Multiple level packs** - Pack system and validation ready
3. **Internationalization** - Translation system ready
4. **Mobile app** - Responsive design and touch handling ready
5. **Monetization** - Payment and user management ready
6. **Analytics** - Data tracking and API layer ready

The key is building the right foundation now so that each feature can be developed quickly and reliably.

The key is to implement these changes incrementally, ensuring each change provides immediate value before moving to the next.
