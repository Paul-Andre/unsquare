"use strict";

import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';

// Level state constants to replace magic numbers
export const LEVEL_STATES = {
  CONCEALED: 0, // contents of level not visible
  LOCKED: 1, // visible but not playable
  UNSOLVED: 2, // playable, not yet solved
  SUBOPTIMAL: 3, // solved, but not in optimal moves
  OPTIMAL: 4, // solved in optimal moves
};
export type LevelState = typeof LEVEL_STATES[keyof typeof LEVEL_STATES];

/**
 * Calculates the state of each level in the book for the level menu, using fixed parameters for how many unsolved and locked levels are allowed to be visible.
 *
 * States:
 *   LEVEL_STATES.CONCEALED (0) - concealed (not visible at all)
 *   LEVEL_STATES.LOCKED (1) - locked (visible but not playable)
 *   LEVEL_STATES.UNSOLVED (2) - unsolved (playable, not yet solved)
 *   LEVEL_STATES.SUBOPTIMAL (3) - suboptimal (solved, but not in optimal moves)
 *   LEVEL_STATES.OPTIMAL (4) - optimal (solved in optimal moves)
 *
 * Parameters:
 *   book            - The book object containing levels.
 *   allowedUnsolved - The maximum number of unsolved (but playable) levels to show.
 *   allowedLocked   - The maximum number of locked (but visible) levels to show.
 *
 * The function iterates through each level and assigns a state based on the player's progress:
 *   - If the level is unsolved and allowedUnsolved > 0, it is marked as unsolved and allowedUnsolved is decremented.
 *   - If the level is unsolved but allowedUnsolved is 0 and allowedLocked > 0, it is marked as locked and allowedLocked is decremented.
 *   - If neither unsolved nor locked slots are available, the level is concealed.
 *   - If the level is solved suboptimally, it is marked as suboptimal.
 *   - If the level is solved optimally, it is marked as optimal.
 *
 * Returns an array of states for each level.
 */
export function calculateStatesWithParams(book: Book, allowedUnsolved: number, allowedLocked: number): LevelState[] {
  let states: LevelState[] = [];
  for (let i = 0; i < book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best === null) {
      if (allowedUnsolved) {
        states[i] = LEVEL_STATES.UNSOLVED;
        allowedUnsolved -= 1;
      } else if (allowedLocked) {
        states[i] = LEVEL_STATES.LOCKED;
        allowedLocked -= 1;
      } else {
        states[i] = LEVEL_STATES.CONCEALED;
      }
    } else if (par === null || best > par) {
      states[i] = LEVEL_STATES.SUBOPTIMAL;
    } else {
      states[i] = LEVEL_STATES.OPTIMAL;
    }
  }
  return states;
}

// Calculates the state of each level in the book for the level menu, using a proportional unlocking system.
// - Starts with a fixed number of unsolved levels allowed to be visible (allowedUnsolved = 3).
// - As the player solves levels suboptimally or optimally, allowedUnsolved increases by a small amount (suboptimalIncrease or optimalIncrease).
// - Levels are marked as:
//   LEVEL_STATES.CONCEALED (0): concealed (not visible at all)
//   LEVEL_STATES.LOCKED (1): locked (visible but not playable)
//   LEVEL_STATES.UNSOLVED (2): unsolved (playable, not yet solved)
//   LEVEL_STATES.SUBOPTIMAL (3): suboptimal (solved, but not in optimal moves)
//   LEVEL_STATES.OPTIMAL (4): optimal (solved in optimal moves)
// - Up to 50 locked levels are allowed to be visible.
export function calculateStatesProportional(book: Book): LevelState[] {
  let allowedUnsolved = 3;
  const suboptimalIncrease = 0.2;
  const optimalIncrease = 0.5;

  let allowedLocked = 50;

  let states = [];
  for (let i = 0; i < book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best === null) {
      if (allowedUnsolved > 0) {
        states[i] = LEVEL_STATES.UNSOLVED; // unsolved and playable
        allowedUnsolved -= 1;
      } else if (allowedLocked) {
        states[i] = LEVEL_STATES.LOCKED; // locked but visible
        allowedLocked -= 1;
      } else {
        states[i] = LEVEL_STATES.CONCEALED; // concealed
      }
    } else if (par === null || best > par) {
      states[i] = LEVEL_STATES.SUBOPTIMAL; // solved suboptimally
      allowedUnsolved += suboptimalIncrease;
    } else {
      states[i] = LEVEL_STATES.OPTIMAL; // solved optimally
      allowedUnsolved += optimalIncrease;
    }
  }
  return states;
}

export function calculateStates(book: Book): LevelState[] {
  if (book.levels.length == 0) {
    return [];
  }
  // Just unlock all...
  return calculateStatesWithParams(book, 100000, 50);
}

/**
 * Calculate the state of a single level based on whether it's been solved and how well.
 * Returns UNSOLVED, SUBOPTIMAL, or OPTIMAL (not CONCEALED or LOCKED, which require book context).
 * @param {Level} level - The level to calculate state for
 * @returns {number} One of LEVEL_STATES.UNSOLVED, LEVEL_STATES.SUBOPTIMAL, or LEVEL_STATES.OPTIMAL
 */
export function calculateLevelState(level: Level): LevelState {
  const best = level.getBestNumMoves();
  const par = level.par;
  
  if (best === null) {
    return LEVEL_STATES.UNSOLVED;
  } else if (par === null || best > par) {
    return LEVEL_STATES.SUBOPTIMAL;
  } else {
    return LEVEL_STATES.OPTIMAL;
  }
}

/**
 * Apply the appropriate CSS class to an element based on its level state.
 * Removes all existing state classes before adding the new one.
 * @param {HTMLElement} element - The DOM element to apply the class to
 * @param {number} state - One of the LEVEL_STATES constants
 */
export function applyStateClass(element: HTMLElement, state: LevelState): void {
  // Remove all existing state classes
  element.classList.remove(
    "icon_concealed",
    "icon_locked",
    "icon_unsolved",
    "icon_suboptimal",
    "icon_optimal"
  );

  // Map state to CSS class
  const stateClass = {
    [LEVEL_STATES.CONCEALED]: "icon_concealed",
    [LEVEL_STATES.LOCKED]: "icon_locked",
    [LEVEL_STATES.UNSOLVED]: "icon_unsolved",
    [LEVEL_STATES.SUBOPTIMAL]: "icon_suboptimal",
    [LEVEL_STATES.OPTIMAL]: "icon_optimal",
  }[state];

  if (stateClass) {
    element.classList.add(stateClass);
  }
}

