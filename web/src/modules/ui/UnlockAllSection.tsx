"use strict";

import { h } from 'dom-chef';
import { Book } from '../core/Book.ts';
import { appContext } from '../core/AppContext.ts';

export interface UnlockAllSectionProps {
  book: Book;
  container: HTMLElement;
  showText?: boolean;
}

/**
 * Creates and manages an unlock all section component
 * Displays when book has fewer levels than fullAmount and has a previous field
 */
export function createUnlockAllSection(props: UnlockAllSectionProps): HTMLElement | null {
  const { book, container } = props;

  // Clear container
  container.innerHTML = "";

  let text: HTMLDivElement | null = null;
    if (props.showText) {
        let label;
        if( (book.fullAmount !== undefined) && book.levels.length < book.fullAmount) {
          label = `Showing last ${book.levels.length} levels out of ${book.fullAmount}`
        } else {
          label = "Showing all levels";
        }
      text = (
      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '0.8em' }}>
        {label}
      </div>
    ) as any as HTMLDivElement;
  };

  console.log("book in sectin", book);
  let button = null;
  if (book.previous) {
    button = (
      <button
        style={{ display: 'block', margin: '0 auto', fontSize: '1.1em' }}
      >
        Unlock All
      </button>
    ) as any as HTMLButtonElement;
    
    button.onclick = () => {
      appContext.processBookNavigation(book.previous!);
    };
  }

  const section = (
    <div style={{ marginTop: '20px' }}>
      {text}
      {button}
    </div>
  ) as any as HTMLDivElement;

  container.appendChild(section);

  return section;
}

