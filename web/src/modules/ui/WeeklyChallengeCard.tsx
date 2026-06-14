/** @jsx h */
"use strict";

import { h } from 'dom-chef';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
import { createLevelIcon, updateLevelIconState } from './LevelIcon.tsx';
import { LEVEL_STATES } from './levelStateUtils.ts';
import { appContext } from '../core/AppContext.ts';
import { getCachedChallengeStatistics } from '../core/levelUtils.ts';
import { fetchChallengeStatistics, updateChallengeStatistics } from '../core/challengeStatistics.ts';
import { ChallengeStatistics } from '../core/challengeStatistics.ts';

export interface WeeklyChallengeCardProps {
  level: Level;
  book: Book;
  container: HTMLElement;
  additionallyAppended?: HTMLElement;
}

/**
 * Creates and manages a weekly challenge card component
 */
export function createWeeklyChallengeCard(props: WeeklyChallengeCardProps): HTMLElement {
  const { level, book, container } = props;

  // Clear container
  container.innerHTML = "";

  const heading = (
    <h2 id="weeklyChallengeHeading">
      {(level.longName || "Weekly Challenge") + ":"}
    </h2>
  ) as any as HTMLHeadingElement;

  const iconSlot = (
    <div className="icon_slot" style={{flexShrink: 0}}></div>
  ) as any as HTMLDivElement;

  const statYou = (
    <div className="challenge_stat_line" id="challengeStatYou">you: -</div>
  ) as any as HTMLDivElement;

  const statTop = (
    <div className="challenge_stat_line" id="challengeStatTop">top: ?</div>
  ) as any as HTMLDivElement;

  const statRank = (
    <div className="challenge_stat_line" id="challengeStatRank">rank: -/?</div>
  ) as any as HTMLDivElement;

  const statistics = (
    <div className="challenge_statistics">
      {statYou}
      {statTop}
      {statRank}
    </div>
  ) as any as HTMLDivElement;

  const iconWrapper = (
    <div className="challenge_icon_wrapper">
      {iconSlot}
      {statistics}
      {props.additionallyAppended}
    </div>
  ) as any as HTMLDivElement;

  const iconContainer = (
    <div id="challengeIconContainer">
      {iconWrapper}
    </div>
  ) as any as HTMLDivElement;

  const card = (
    <div id="weeklyChallengCard">
      {heading}
      {iconContainer}
    </div>
  ) as any as HTMLDivElement;

  container.appendChild(card);

  // Create and add the level icon
  const iconElement = createLevelIcon({
    level,
    state: LEVEL_STATES.UNSOLVED,
    onClick: () => {
      appContext.playLevel(level, book);
    },
  });

  iconSlot.appendChild(iconElement);

  // Update statistics display
  function updateStatisticsDisplay(stats: ChallengeStatistics | null) {
    if (!stats) {
      const cached = getCachedChallengeStatistics(level.id);
      const totalPlayers = cached?.total_players;
      statYou.textContent = "you: -";
      statTop.textContent = "top: ?";
      statRank.textContent = totalPlayers ? `rank: -/${totalPlayers}` : "rank: -/-";
      updateLevelIconState(iconElement, LEVEL_STATES.UNSOLVED);
      return;
    }

    const playerBest = stats.player_best ?? null;
    const topBest = stats.top_best ?? null;
    const rank = stats.rank ?? null;
    const totalPlayers = stats.total_players ?? null;

    statYou.textContent = playerBest !== null ? `you: ${playerBest}` : "you: -";
    statTop.textContent = topBest !== null ? `top: ${topBest}` : "top: ?";
    statRank.textContent = rank !== null && totalPlayers !== null 
      ? `rank: ${rank}/${totalPlayers}` 
      : `rank: -/${totalPlayers ?? "-"}`;

    if (playerBest === null) {
      updateLevelIconState(iconElement, LEVEL_STATES.UNSOLVED);
    } else if (topBest !== null && playerBest === topBest) {
      updateLevelIconState(iconElement, LEVEL_STATES.OPTIMAL);
    } else {
      updateLevelIconState(iconElement, LEVEL_STATES.SUBOPTIMAL);
    }
  }

  // Load and display statistics
  async function loadStatistics() {
    // Display cached statistics immediately
    const cachedStats = getCachedChallengeStatistics(level.id);
    if (cachedStats) {
      updateStatisticsDisplay(cachedStats);
    }

    // Fetch fresh statistics
    const stats = await updateChallengeStatistics(level.id);
    if (stats) {
      updateStatisticsDisplay(stats);
    }
  }

  // Initial load
  if (level.mode == "challenge") {
    loadStatistics();
  }

  return card;
}

