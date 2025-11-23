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

  // Tooltip state management
  let activeTooltip = null;

  // Show tooltip and hide previous one
  function showTooltip(tooltip) {
    if (activeTooltip && activeTooltip !== tooltip) {
      activeTooltip.classList.remove("visible");
    }
    if (tooltip) {
      tooltip.classList.add("visible");
      activeTooltip = tooltip;
    }
  }

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

    // Create tooltip for bars with data
    if (hasData || isPlayerBar) {
      const tooltip = document.createElement("div");
      tooltip.className = "histogramTooltip";
      const solutionText = count === 1 ? "solution" : "solutions";
      tooltip.textContent = `${moveCount} moves: ${count} ${solutionText}`;
      bar.appendChild(tooltip);

      barContainer.addEventListener("mouseenter", () => {
        showTooltip(tooltip);
      });
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

  // Pointer event handling for mobile drag support
  let isDragging = false;

  // Helper function to find bar container and its tooltip under a point
  function findBarContainerUnderPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Traverse up the DOM tree to find .histogramBarContainer
    let current = element;
    while (current && current !== container) {
      if (current.classList && current.classList.contains("histogramBarContainer")) {
        // Find the tooltip within this bar container
        const tooltip = current.querySelector(".histogramTooltip");
        return tooltip;
      }
      current = current.parentElement;
    }
    return null;
  }

  // Check if point is within container bounds
  function isPointInContainer(x, y) {
    const rect = container.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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
    const tooltip = findBarContainerUnderPoint(e.clientX, e.clientY);
    if (tooltip) {
      showTooltip(tooltip);
    }
    e.preventDefault();
  });

  container.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    // Check if still in container, but don't hide tooltip if leaving
    if (isPointInContainer(e.clientX, e.clientY)) {
      const tooltip = findBarContainerUnderPoint(e.clientX, e.clientY);
      if (tooltip) {
        showTooltip(tooltip);
      }
      // If no bar found (empty space), keep current tooltip visible
    }
    // If outside container, keep current tooltip visible
    e.preventDefault();
  });

  container.addEventListener("pointerup", (e) => {
    isDragging = false;
    // Keep tooltip visible (don't hide it)
  });

  container.addEventListener("pointercancel", (e) => {
    isDragging = false;
    hideTooltip();
  });

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

