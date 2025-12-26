"use strict";

import { h } from 'dom-chef';
import { assert, cast } from '../utils/helpers.ts';
import { LevelIconGrid } from './LevelIconGrid.tsx';
import { calculateLevelState, applyStateClass, LEVEL_STATES } from './levelStateUtils.ts';
import { createLevelIcon } from './LevelIcon.tsx';
import { appContext } from '../core/AppContext.ts';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
import { createWeeklyChallengeCard } from './WeeklyChallengeCard.tsx';
import { getDailyLevelsBook, getWeeklyChallengesBook, getMainBook } from '../core/loadBook.ts';
import { MouseEventHandler } from 'react';

export class MainLevelMenuScreen {
  root: HTMLElement;
  dailyLevelsBook: Book;
  weeklyChallengesBook: Book;
  levelMenu: LevelIconGrid;
  weeklyChallengeCardContainer: HTMLElement | null = null;
  
  constructor(root: HTMLElement) {
    this.root = root;
    
    // Load daily levels
    this.dailyLevelsBook = getDailyLevelsBook();

    // Load weekly challenge book
    this.weeklyChallengesBook = getWeeklyChallengesBook();

    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, false, {
      onIconClick: (level: Level, element: HTMLElement) => {
        if (this.levelMenu.book !== null) {
          appContext.playLevel(level, this.levelMenu.book);
        }
      },
    });

    this.weeklyChallengeCardContainer = root.querySelector("#weeklyChallengCardContainer");

    this.loadBook();
  }

  onShow() {
    this.levelMenu.onShow();
    this.displayDailyIcon();
  }

  /**
   * Create a "see all" button that navigates to the book level menu
   */
  private createSeeAllButton(text: string, onClick?: MouseEventHandler<HTMLButtonElement>): HTMLElement {
    const button = (
      <button
        // href="#"
        style={{ alignSelf: "flex-end", marginLeft: "20px" }}
        onClick={onClick} >
        {text}
      </button>
    ) as any as HTMLElement;
    return button;
  }

  loadBook() {
    try {
      // Load main book
      const data = getMainBook();

      this.levelMenu.openBook(data);

      this.levelMenu.displayIcons();
      this.displayDailyIcon();

      // Create weekly challenge card
      if (this.weeklyChallengeCardContainer) {
        const seeAllButton = this.createSeeAllButton("See previous weekly",
          () => {
            appContext.challengeLevelMenu.openBook(this.weeklyChallengesBook);
            appContext.screenManager.switchTo("challengeLevelMenu");
          }
        );
        createWeeklyChallengeCard({
          level: this.weeklyChallengesBook.levels.at(-1)!,
          book: this.weeklyChallengesBook,
          container: this.weeklyChallengeCardContainer,
          additionallyAppended: seeAllButton,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  displayDailyIcon() {
    const iconSlot = this.root.querySelector("#dailyIconContainer .challenge_icon_wrapper");
    const heading = this.root.querySelector("#dailyLevelHeading");
    
    if (!iconSlot || !heading) {
      return;
    }

    // Get today's daily level (last level in the dailies book)
    if (this.dailyLevelsBook.levels.length === 0) {
      return;
    }

    const dailyLevel = this.dailyLevelsBook.levels[this.dailyLevelsBook.levels.length - 1];

    heading.textContent = dailyLevel.longName;

    iconSlot.innerHTML = "";
    
    const state = calculateLevelState(dailyLevel);
    const iconElement = createLevelIcon({
      level: dailyLevel,
      state,
      onClick: () => {
        appContext.playLevel(dailyLevel, this.dailyLevelsBook);
      },
    });
    iconElement.style.flexShrink = "0";
    
    iconSlot.appendChild(iconElement);

    const seeAllButton = this.createSeeAllButton("See previous daily", () => {
      appContext.gridLevelMenu.openBook(this.dailyLevelsBook);
      appContext.screenManager.switchTo("gridLevelMenu");
    });
    iconSlot.appendChild(seeAllButton);
  }
}
