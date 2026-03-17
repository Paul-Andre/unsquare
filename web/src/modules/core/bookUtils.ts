"use strict";
import { generate_id } from '../utils/helpers.ts';
import { Level } from './Level';
import { Book } from './Book'

// For use with JSON.stringify
export function book_replacer(key: string, value: any) {
  if (value instanceof Level) {
    return value.toJsonObject();
  }
  return value;
}

// For use with JSON.parse
export function book_reviver(key: string, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.__type__ == "Level") {
      return Level.fromJsonObject(value);
    }
    if (value.tileShape == "square") {
      return Level.fromJsonObject(value);
    }
    if (value.tiles) {
      return Level.fromJsonObject(value);
    }
    if (value.levels) {
      reindexLevels(value.levels);
      return value;
    }
  }
  return value;
}

export function reindexLevels(levels: Level[]): void {
  let index = 0;
  for (let i = 0; i < levels.length; i++) {
    let level = levels[i];
    level.index = index++;
  }
}

export function create_empty_book(): Book {
  return {
    id: generate_id("book"),
    title: "New Book",
    levels: [],
  };
}

export function save_editor_book(book: Book): void {
  let key = "editor_" + book.id;
  book.source = key;
  localStorage.setItem(key, JSON.stringify(book, book_replacer));
}

export function pushLevelToBook(book: Book, level: Level): void {
  level.index = book.levels.length;
  level.book = book;
  book.levels.push(level);
  save_editor_book(book);
}