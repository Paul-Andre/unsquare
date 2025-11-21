"use strict";

/**
 * Renders a histogram showing the distribution of solution move counts
 * @param {HTMLElement} container - The container element to render the histogram in
 * @param {Object} histogramData - Object mapping move counts to solution counts, e.g. { 3: 5, 4: 12, 5: 8 }
 * @param {number} playerMoves - The player's move count to highlight
 */
export function renderHistogram(container, histogramData, playerMoves) {
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

  const minMove = 1;
  const maxMove = Math.max(...moveCounts);
  const maxCount = Math.max(...Object.values(dataWithPlayer), 1);

  // Render bars for all move counts in the range, including gaps
  for (let moveCount = minMove; moveCount <= maxMove; moveCount++) {
    const count = dataWithPlayer[moveCount] || 0;
    const hasData = moveCount in dataWithPlayer;
    const isPlayerBar = moveCount === playerMoves;

    let percentage;
    if (isPlayerBar && count === 0) {
      percentage = 0;
    } else if (!hasData) {
      percentage = 0;
    } else {
      percentage = (count / maxCount) * 100;
    }

    const barContainer = document.createElement("div");
    barContainer.className = "histogramBarContainer";

    const bar = document.createElement("div");
    bar.className = `histogramBar ${isPlayerBar ? "playerBar" : ""}`;
    if (hasData || isPlayerBar) {
      bar.style.height = `${percentage}%`;
      bar.setAttribute("data-moves", moveCount);
      bar.setAttribute("data-count", count);
    } else {
      bar.style.height = "0%";
      bar.style.visibility = "hidden";
    }

    barContainer.appendChild(bar);

    if (isPlayerBar) {
      const playerTriangle = document.createElement("div");
      playerTriangle.className = "playerTriangle";
      barContainer.appendChild(playerTriangle);
      barContainer.classList.add("playerBar");
    }

    container.appendChild(barContainer);
  }

}


export function generateDummyHistogramData(center) {
  const minMoves = Math.max(3, center - 8);
  const maxMoves = center + 25;

  const generateLongTailDistribution = (center, total, tailStrength) => {
    const data = {};
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

