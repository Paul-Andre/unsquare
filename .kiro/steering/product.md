# Product Overview

Unflip is a puzzle game where players flip square areas (2x2 or larger) on a grid to invert tile colors (black ↔ white) with the goal of making all tiles white.

## Core Features

- Main progression levels with par (optimal move count) tracking
- Daily and weekly challenge levels
- Level editor with sharing via URL
- Leaderboard and solution statistics (histograms)
- User authentication and premium content (archive access)
- Payment integration via Stripe for unlocking archived levels

## Platforms

- Web (primary): Progressive Web App with offline support
- Server: Express.js backend for level generation/validation
- Solver: C++ algorithms for level generation and solution finding

## Monetization

- Free main levels
- Premium: Daily/Weekly archive ($4.99) and full access ($19.99)
- Stripe checkout integration via Supabase Edge Functions
