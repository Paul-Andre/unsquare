/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Leaderboard } from './Leaderboard';
import {showAuthModal} from './modules/ui/AuthModal.tsx';
import * as auth from './modules/utils/auth.ts';

// Expose auth module for testing
window.auth = auth;

// Get the context
let contest_hashid = new URLSearchParams(window.location.search).get("contest")?.trim() ?? "5ap1";

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Leaderboard contest_hashid={contest_hashid} />
    </React.StrictMode>
  );
}
