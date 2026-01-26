/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Leaderboard } from './Leaderboard';
import {showAuthModal} from './modules/ui/AuthModal.tsx';
import * as auth from './modules/utils/auth.ts';

// Expose auth module for testing
window.auth = auth;

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Leaderboard />
    </React.StrictMode>
  );
}
