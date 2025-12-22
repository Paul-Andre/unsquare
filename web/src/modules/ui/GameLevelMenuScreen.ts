"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { LevelIconGrid } from '../ui/LevelIconGrid.tsx';
import { calculateLevelState, applyStateClass, LEVEL_STATES } from '../ui/levelStateUtils.ts';
import { createLevelIcon } from '../ui/LevelIcon.tsx';
import { appContext } from '../core/AppContext.ts';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
import { createWeeklyChallengeCard } from '../ui/WeeklyChallengeCard.tsx';
import { getDailyLevelsBook, getWeeklyChallengesBook, getMainBook } from '../core/loadBook.ts';



export class GameLevelMenuScreen {
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


  loadBook() {
    try {
      // Load main book
      const data = getMainBook();

      this.levelMenu.openBook(data);

      this.levelMenu.displayIcons();
      this.displayDailyIcon();

              // Add "see all" button
              const seeAllButton = document.createElement("a");
              // seeAllButton.className = "seeAllChallengesButton";
              seeAllButton.textContent = "See previous weekly";
              seeAllButton.style.alignSelf = "flex-end";
              seeAllButton.style.marginLeft = "20px"
              seeAllButton.href = "#";
              seeAllButton.onclick = () => {
                appContext.challengeLevelMenu.openBook(this.weeklyChallengesBook);
                appContext.screenManager.switchTo("challengeLevelMenu");
              };
      
      // Create weekly challenge card
      if (this.weeklyChallengeCardContainer) {
        createWeeklyChallengeCard({
          level: this.weeklyChallengesBook.levels.at(-1)!,
          book: this.weeklyChallengesBook,
          container: this.weeklyChallengeCardContainer,
          additionallyAppended: seeAllButton,
        });
        

      }
    } catch (e) {
      //alert("Error loading levels");
      console.error(e);
    }
  }

  displayDailyIcon() {
    const iconSlot = this.root.querySelector("#dailyIconContainer .icon_slot");
    const heading = this.root.querySelector("#dailyLevelHeading");
    
    if (!iconSlot || !heading) {
      return;
    }

    // Get today's daily level (last level in the dailies book)
    const dailiesBook = getDailyLevelsBook();
    if (dailiesBook.levels.length === 0) {
      return;
    }

    const dailyLevel = dailiesBook.levels[dailiesBook.levels.length - 1];

    heading.textContent = dailyLevel.longName;

    iconSlot.innerHTML = "";
    
    const state = calculateLevelState(dailyLevel);
    const iconElement = createLevelIcon({
      level: dailyLevel,
      state,
      onClick: () => {
        appContext.playLevel(dailyLevel, dailiesBook);
      },
    });
    
    iconSlot.appendChild(iconElement);
  }
}
