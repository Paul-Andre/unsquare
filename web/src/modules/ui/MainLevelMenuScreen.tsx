/** @jsx h */
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
import { weeklyChallengesBookSignal, getMainBook, dailyLevelsBookSignal } from '../core/loadBook.ts';
import { MouseEventHandler } from 'react';
import { getCurrentContestId } from 'modules/core/contests.ts';
import { SingleSignalConsumer } from 'modules/utils/Signal.ts';

export class MainLevelMenuScreen {
  root: HTMLElement;
  dailyLevelsBook: Book;
  weeklyChallengesBookSlot: SingleSignalConsumer<Book | null>;
  levelMenu: LevelIconGrid;
  
  constructor(root: HTMLElement) {
    this.root = root;
    
    // Load daily levels
    this.dailyLevelsBook = dailyLevelsBookSignal.get();

    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, false, {
      onIconClick: (level: Level, element: HTMLElement) => {
        if (this.levelMenu.book !== null) {
          appContext.playLevel(level, this.levelMenu.book);
        }
      },
    });



    this.loadMainBook();

    this.displayDailyIcon();
    this.weeklyChallengesBookSlot = new SingleSignalConsumer((book:Book|null) => {
      if (book === null) {
        return;
      }
      let weeklyChallengeCardContainer = root.querySelector("#weeklyChallengCardContainer");

      if (weeklyChallengeCardContainer instanceof HTMLElement) {
        const seeAllButton = this.createSeeAllButton("See previous weekly",
          () => {
            appContext.challengeLevelMenu.bindBookSignal(weeklyChallengesBookSignal);
            appContext.screenManager.switchTo("challengeLevelMenu");
          }
        );

        createWeeklyChallengeCard({
          level: book.levels.at(-1)!,
          book: book,
          container: weeklyChallengeCardContainer,
          additionallyAppended: seeAllButton,
        });
      }
    });

    this.weeklyChallengesBookSlot.bindAndFire(weeklyChallengesBookSignal);
      

    if (getCurrentContestId() !== null) {
      const dailyContainer = cast(this.root.querySelector("#dailyIconContainer"), HTMLElement);
      dailyContainer.hidden = true;
      const weeklyContainer = cast(this.root.querySelector("#weeklyChallengCardContainer"), HTMLElement);
      weeklyContainer.hidden = true;
      const mainLevelsTitle = cast(this.root.querySelector("#mainLevelsTitle"), HTMLHeadingElement);
      mainLevelsTitle.innerText = "Contest Levels:"
    }

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

  loadMainBook() {
    try {
      // Load main book
      const data = getMainBook();

      this.levelMenu.openBook(data);

      this.levelMenu.displayIcons();
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
      this.dailyLevelsBook = dailyLevelsBookSignal.get();
      appContext.gridLevelMenu.bindBookSignal(dailyLevelsBookSignal);
      appContext.gridLevelMenu.openBook(dailyLevelsBookSignal.get());
      appContext.screenManager.switchTo("gridLevelMenu");
    });
    iconSlot.appendChild(seeAllButton);
  }
}
