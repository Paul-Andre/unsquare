/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Leaderboard } from './Leaderboard';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Leaderboard />
    </React.StrictMode>
  );
}
