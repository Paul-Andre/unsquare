/** @jsx h */
"use strict";

import { h } from 'dom-chef';
import { getCachedLevelIconDataUrl } from './icon.ts';
import { ICON_SIZE } from '../utils/config.ts';
import { Level } from '../core/Level.ts';
import { LevelState, applyStateClass, LEVEL_STATES } from './levelStateUtils.ts';
import { IconDisplayType, calculateIconDisplayValue, getParDisplayColor } from './iconDisplayCalculations.ts';

export interface LevelIconProps {
  level: Level;
  state: LevelState;
  isEditor?: boolean;
  iconDisplayType?: IconDisplayType;
  nonHiddenIndex?: number | null;
  onClick?: (level: Level, element: HTMLElement) => void;
}

/**
 * Creates a level icon DOM element.
 * Handles icon image display, state-based CSS classes, and optional metric display.
 */
export function createLevelIcon(props: LevelIconProps): HTMLDivElement {
  const { level, state, isEditor = false, iconDisplayType = "none", nonHiddenIndex = null, onClick } = props;

  // Get cached or generate icon dataURL
  const dataURL = getCachedLevelIconDataUrl(level);

  const iconImg = (
    <img
      className="level_icon_image"
      src={dataURL}
      style={{ width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }}
    />
  ) as any as HTMLImageElement;

  const parDisplay = (<div className="level_icon_par"></div>) as any as HTMLDivElement;

  const element = (
    <div className="level_icon">
      {iconImg}
      {parDisplay}
    </div>
  ) as any as HTMLDivElement;

  // Store level reference on element for click handling
  (element as any).level = level;

  // Set up click handler if provided and level is playable
  if (onClick && (isEditor || state >= LEVEL_STATES.UNSOLVED)) {
    element.onclick = (event: MouseEvent) => {
      onClick(level, element);
    };
  }

  if (isEditor) {
    // Editor mode: show display value and apply editor-specific classes
    const displayValue = calculateIconDisplayValue(level, iconDisplayType, nonHiddenIndex);

    if (displayValue !== null) {
      parDisplay.innerText = String(displayValue);
    }

    // Make font smaller for daily display type
    if (iconDisplayType === "daily") {
      parDisplay.style.fontSize = "12px";
    }

    // Only apply colors when using par mode
    // if (iconDisplayType === "par" && displayValue !== null && typeof displayValue === "number") {
    //   const color = getParDisplayColor(displayValue);
    //   parDisplay.style.color = color;
    //   element.style.borderColor = color;
    // }

    if (level.isIcon) {
      element.classList.add("bookIconRepresentative");
    }
    if (level.hidden) {
      element.classList.add("icon_hidden");
    }
  } else {
    // Player mode: apply state class
    applyStateClass(element, state);
  }

  return element;
}

/**
 * Updates an existing level icon element with new state/display.
 * Useful for refreshing icons without recreating them.
 */
export function updateLevelIconState(element: HTMLElement, state: LevelState): void {
  applyStateClass(element, state);
}

