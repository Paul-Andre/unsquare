/** @jsx h */
"use strict";

import { h } from 'dom-chef';
import { assert } from '../utils/helpers.ts';

/**
 * Renders a histogram showing the distribution of solution move counts
 * @param {HTMLElement} container - The container element to render the histogram in
 * @param {Object} histogramData - Object mapping move counts to solution counts, e.g. { 3: 5, 4: 12, 5: 8 }
 * @param {number} playerMoves - The player's move count to highlight
 */
export function renderHistogram(container: HTMLElement, histogramData: Record<number, number>, playerMoves: number | null) {
  // Clear existing content
  container.innerHTML = "";

  if (!histogramData || Object.keys(histogramData).length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }

  // Ensure player's move count is always in the data (with count of 0 if not present)
  const dataWithPlayer = { ...histogramData };
  if (playerMoves != null && !(playerMoves in dataWithPlayer)) {
    dataWithPlayer[playerMoves] = 0;
  }

  const moveCounts = Object.keys(dataWithPlayer).map(Number);
  if (moveCounts.length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }
  moveCounts.sort((a, b) => a - b);

  const totalSolutionCount = Object.values(dataWithPlayer).reduce((acc, count) => acc + count, 0);
  let percentile99 = 0;
  let cumulativeSolutionCount = 0;
  for (const moveCount of moveCounts) {
    // TODO: Bug? Should be dataWithPlayer[moveCount] instead of moveCount
    // need to fix and adjust as appropriate.
    cumulativeSolutionCount += moveCount;
    if (cumulativeSolutionCount / totalSolutionCount >= 0.99) {
      percentile99 = moveCount;
      break;
    }
  }

  const maxMoveCount = moveCounts[moveCounts.length - 1];

  const rangeBegin = 1;
  const rangeEnd = playerMoves != null 
    ? Math.max(Math.min(Math.ceil(percentile99*3), maxMoveCount), playerMoves)
    : Math.min(Math.ceil(percentile99*3), maxMoveCount);

  const maxSolutionCount = Math.max(...Object.values(dataWithPlayer), 1);

  // Tooltip state management
  let activeTooltip: HTMLElement | null = null;
  const barContainers: { container: HTMLElement, tooltip: HTMLElement }[] = []; // Store all bar containers with tooltips

  // Show tooltip and hide previous one
  function showTooltip(tooltip: HTMLElement) {
    if (activeTooltip && activeTooltip !== tooltip) {
      activeTooltip.classList.remove("visible");
    }
    if (tooltip) {
      tooltip.classList.add("visible");
      activeTooltip = tooltip;
    }
  }

  // Render bars for all move counts in the range, including gaps
  for (let moveCount = rangeBegin; moveCount <= rangeEnd; moveCount++) {
    const solutionCount = dataWithPlayer[moveCount] || 0;
    const hasData = moveCount in dataWithPlayer;
    const isPlayerBar = moveCount === playerMoves;
    const shouldShow = hasData || isPlayerBar;

    // Calculate percentage height for the bar
    const percentage = shouldShow && solutionCount > 0
      ? (solutionCount / maxSolutionCount) * 100
      : 0;

    // Create tooltip element if needed
    let tooltip: HTMLElement | null = null;
    if (shouldShow) {
      tooltip = <div className="histogramTooltip">{moveCount}: {solutionCount}</div>;
    }

    const bar = (
      <div
        className={`histogramBar ${isPlayerBar ? "playerBar" : ""}`}
        style={{
          height: `${percentage}%`,
          visibility: shouldShow ? "visible" : "hidden",
        }}
        data-moves={shouldShow ? moveCount.toString() : undefined}
        data-count={shouldShow ? solutionCount.toString() : undefined}
      >
        {tooltip}
      </div>
    );

    const barContainer = (
      <div className={`histogramBarContainer ${isPlayerBar ? "playerBar" : ""}`}>
        {bar}
        {isPlayerBar && <div className="playerTriangle" />}
      </div>
    ) as HTMLElement;

    // Set up event handlers for bars with data
    if (shouldShow && tooltip) {
      barContainer.addEventListener("mouseenter", () => {
        showTooltip(tooltip);
      });

      // Store bar container with tooltip for closest-bar finding
      barContainers.push({ container: barContainer, tooltip });
    }

    container.appendChild(barContainer);
  }

  // Pointer event handling for mobile drag support
  let isDragging = false;

  // Find the closest bar to a given point
  function findClosestBarTooltip(x: number, y: number): HTMLElement | null {
    if (barContainers.length === 0) return null;

    const containerRect = container.getBoundingClientRect();
    const relativeX = x - containerRect.left;

    let closestBar = null;
    let minDistance = Infinity;

    for (const { container: barContainer, tooltip } of barContainers) {
      const barRect = barContainer.getBoundingClientRect();
      const barCenterX = (barRect.left - containerRect.left) + barRect.width / 2;
      const distance = Math.abs(relativeX - barCenterX);

      if (distance < minDistance) {
        minDistance = distance;
        closestBar = tooltip;
      }
    }

    return closestBar;
  }

  // Hide active tooltip
  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.classList.remove("visible");
      activeTooltip = null;
    }
  }

  container.addEventListener("pointerdown", (e) => {
    isDragging = true;
    // Find closest bar to show its tooltip
    const tooltip = findClosestBarTooltip(e.clientX, e.clientY);
    if (tooltip) {
      showTooltip(tooltip);
    }
    e.preventDefault();
  });

  container.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    // Always show the closest bar's tooltip while dragging
    const tooltip = findClosestBarTooltip(e.clientX, e.clientY);
    if (tooltip) {
      showTooltip(tooltip);
    }
    e.preventDefault();
  });

  container.addEventListener("pointerup", () => {
    isDragging = false;
    // Keep tooltip visible (don't hide it)
  });

  container.addEventListener("pointercancel", () => {
    isDragging = false;
    hideTooltip();
  });
}

export function generateDummyHistogramData(center: number): { allSolutions: Record<number, number>, bestPerPlayer: Record<number, number>, uniqueSolutions: Record<number, number> } {
  const minMoves = Math.max(3, center - 8);
  const maxMoves = center + 25;

  const generateLongTailDistribution = (center: number, total: number, tailStrength: number): Record<number, number> => {
    const data: Record<number, number> = {};
    const decayFactor = 2.5;
    
    // Generate distribution with exponential decay and gaps
    for (let moves = minMoves; moves <= maxMoves; moves++) {
      const distance = Math.abs(moves - center);
      const weight = Math.exp(-distance / decayFactor);
      const skipProbability = Math.min(0.5, 0.1 + (distance / 20));
      
      if (Math.random() < skipProbability && moves !== center) {
        continue;
      }
      
      const randomFactor = 0.7 + Math.random() * 0.6;
      const count = Math.floor(total * weight * randomFactor * tailStrength);
      
      if (count > 0) {
        data[moves] = count;
      }
    }
    
    // Add sparse tail data points
    for (let moves = center + 10; moves <= maxMoves; moves += Math.floor(2 + Math.random() * 3)) {
      if (!data[moves] && Math.random() > 0.6) {
        data[moves] = Math.floor(1 + Math.random() * 3);
      }
    }
    
    return data;
  };

  return {
    allSolutions: generateLongTailDistribution(center, 350, 1.0),
    bestPerPlayer: generateLongTailDistribution(center, 120, 0.8),
    uniqueSolutions: generateLongTailDistribution(center, 45, 0.6)
  };
}

