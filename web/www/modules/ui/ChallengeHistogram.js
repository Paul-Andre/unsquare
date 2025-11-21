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
  if (playerMoves !== null && playerMoves !== undefined && !(playerMoves in dataWithPlayer)) {
    dataWithPlayer[playerMoves] = 0;
  }

  // Get all move counts that have data
  const movesWithData = Object.keys(dataWithPlayer).map(Number).sort((a, b) => a - b);
  if (movesWithData.length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }

  // Determine the full range (min to max) to show proper gaps
  const minMove = 1;
  const maxMove = Math.max(...movesWithData);
  const maxCount = Math.max(...Object.values(dataWithPlayer), 1); // Ensure at least 1 for percentage calculation



  // Render bars for ALL move counts in the range, including gaps
  for (let moveCount = minMove; moveCount <= maxMove; moveCount++) {
    const count = dataWithPlayer[moveCount];
    const hasData = moveCount in dataWithPlayer;
    const isPlayerBar = moveCount === playerMoves;
    
    // For player's bar, ensure it has a minimum height even if count is 0
    // Use the actual count for display, but ensure minimum percentage for visibility
    let percentage;
    if (isPlayerBar && (!hasData || count === 0)) {
      // Player's bar with 0 count: give it a small but visible height (about 3% of max)
      percentage = maxCount > 0 ? Math.max(3, (1 / maxCount) * 100) : 5;
    } else if (!hasData) {
      // Gap: no bar, but still create the container for spacing
      percentage = 0;
    } else {
      percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    }

    const barContainer = document.createElement("div");
    barContainer.className = "histogramBarContainer";

    // // Only show count label if there's data (or it's the player's bar)
    // if (hasData || isPlayerBar) {
    //   const countLabel = document.createElement("div");
    //   countLabel.className = "histogramBarCount";
    //   countLabel.textContent = hasData ? count : 0;
    //   barContainer.appendChild(countLabel);
    // } else {
    //   // Empty space for gap
    //   const emptySpace = document.createElement("div");
    //   emptySpace.className = "histogramBarCount";
    //   emptySpace.style.visibility = "hidden";
    //   barContainer.appendChild(emptySpace);
    // }

    const bar = document.createElement("div");
    bar.className = `histogramBar ${isPlayerBar ? "playerBar" : ""}`;
    if (hasData || isPlayerBar) {
      bar.style.height = `${percentage}%`;
      bar.setAttribute("data-moves", moveCount);
      bar.setAttribute("data-count", hasData ? count : 0);
    } else {
      // Gap: invisible bar to maintain spacing
      bar.style.height = "0%";
      bar.style.visibility = "hidden";
    }

    // const label = document.createElement("div");
    // label.className = "histogramBarLabel";
    // label.textContent = moveCount;
    
    barContainer.appendChild(bar);
    // barContainer.appendChild(label);
    
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
  // Generate data with a long tail distribution
  const minMoves = Math.max(3, center - 8);
  const maxMoves = center + 25; // Long tail extending well beyond optimal

  // Helper to generate a long-tail distribution with gaps
  // Uses exponential decay for the tail
  const generateLongTailDistribution = (center, total, tailStrength) => {
    const data = {};
    let remaining = total;
    
    // First pass: generate main distribution around center with gaps
    for (let moves = minMoves; moves <= maxMoves; moves++) {
      const distance = Math.abs(moves - center);
      
      // Exponential decay for long tail: e^(-distance/decayFactor)
      // Closer to center gets more weight, but tail extends far
      const decayFactor = 2.5;
      const weight = Math.exp(-distance / decayFactor);
      
      // Create gaps: skip some move counts, especially in the tail
      // Closer to center: 10% chance to skip
      // Further away: up to 50% chance to skip
      const skipProbability = Math.min(0.5, 0.1 + (distance / 20));
      if (Math.random() < skipProbability && moves !== center) {
        continue; // Skip this move count to create a gap
      }
      
      // Add some randomness
      const randomFactor = 0.7 + Math.random() * 0.6;
      const count = Math.floor(total * weight * randomFactor * tailStrength);
      
      if (count > 0) {
        data[moves] = count;
        remaining -= count;
      }
    }
    
    // Second pass: ensure we have some sparse data points in the tail with gaps
    for (let moves = center + 10; moves <= maxMoves; moves += Math.floor(2 + Math.random() * 3)) {
      if (!data[moves] && Math.random() > 0.6) {
        const tailCount = Math.floor(1 + Math.random() * 3);
        data[moves] = tailCount;
        remaining -= tailCount;
      }
    }
    
    // Distribute any remaining count to existing keys, favoring center
    if (remaining > 0) {
      const keys = Object.keys(data).map(Number).sort((a, b) => {
        const distA = Math.abs(a - center);
        const distB = Math.abs(b - center);
        return distA - distB; // Prefer closer to center
      });
      
      // Distribute remaining, with preference for center
      for (let i = 0; i < Math.min(keys.length, Math.floor(remaining / 2)); i++) {
        const bonus = Math.floor(remaining / (keys.length - i + 1));
        data[keys[i]] = (data[keys[i]] || 0) + bonus;
        remaining -= bonus;
      }
      
      // Add any final remainder to a random key
      if (remaining > 0 && keys.length > 0) {
        const randomKey = keys[Math.floor(Math.random() * Math.min(keys.length, 5))];
        data[randomKey] = (data[randomKey] || 0) + remaining;
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

