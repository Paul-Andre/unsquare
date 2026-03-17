import { generate_id } from '../utils/helpers';
import { Book } from './Book';
import { Level } from './Level';
import {
  book_replacer,
  book_reviver,
  create_empty_book,
  pushLevelToBook,
  save_editor_book,
} from './bookUtils.ts';

/**
 * Repository for editor books stored in localStorage.
 *
 */
export class EditorBookRepo {
  // The reason this says "editor_book" is because the books are stored in localStorage with the key "editor_<id>", and the id has "book_" as a prefix.
  private readonly listKeyPrefix = 'editor_book';

  list(): Book[] {
    const books: Book[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.listKeyPrefix)) {
        const value = localStorage.getItem(key);
        if (value === null) continue;
        const book = JSON.parse(value, book_reviver) as Book;
        book.source = key;
        books.push(book);
      }
    }
    return books;
  }

  save(book: Book): void {
    save_editor_book(book);
  }

  delete(book: Book): void {
    if (book.source) {
      localStorage.removeItem(book.source);
    }
  }

  createNew(): Book {
    const book = create_empty_book();
    this.save(book);
    return book;
  }

  getDailySavingTarget(): Book {
    const books = this.list();
    for (const book of books) {
      if (book.title.toLowerCase().includes('daily')) {
        return book;
      }
    }
    return books[0];
  }

  serializeAll(books: Book[]): string {
    return JSON.stringify(books, book_replacer);
  }

  parseAll(json: string): Book[] {
    const parsed = JSON.parse(json, book_reviver);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON: expected an array of books');
    }
    return parsed as Book[];
  }

  overwriteAllFromJson(json: string): Book[] {
    const books = this.parseAll(json);

    const existing = this.list();
    for (const book of existing) {
      this.delete(book);
    }

    for (const book of books) {
      this.save(book);
    }

    return books;
  }

  importSingleBookFromJson(json: string): Book {
    const book = JSON.parse(json, book_reviver) as Book;
    book.id = generate_id('book');
    this.save(book);
    return book;
  }
}

export const editorBookRepo = new EditorBookRepo();

export function getDailyLevelsSavingTarget(): Book {
  // Kept as a function for minimal callsite churn (used by AppContext).
  return editorBookRepo.getDailySavingTarget();
}

export function selectBookIconLevel(book: Book): Level | null {
  for (let i = 0; i < book.levels.length; i++) {
    const level = book.levels[i];
    if (level.isIcon) {
      return level;
    }
  }
  if (book.levels.length >= 1) {
    return book.levels[0];
  }
  return null;
}

export function saveLevelCopyAsDaily(level: Level): void {
  let levelCopy = level.clone();
  levelCopy.id = generate_id('level');
  let book = editorBookRepo.getDailySavingTarget();
  pushLevelToBook(book, levelCopy);
  editorBookRepo.save(book);
}
