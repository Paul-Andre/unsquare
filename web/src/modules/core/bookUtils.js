"use strict";
import { generate_id } from '../utils/helpers.js';
import { Level } from './Level.js';

// For use with JSON.stringify
export function book_replacer(key, value) {
  if (value instanceof Level) {
    return value.toJsonObject();
  }
  return value;
}

// For use with JSON.parse
export function book_reviver(key, value) {
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
      // Don't set indices here - let reindexLevels() handle it to account for hidden levels
      // Indices will be set when the book is opened in the editor or when reindexLevels() is called
      // TODO: probably SHOULD set indices here, possibly even have two different types of indices.
    }
  }
  return value;
}

export function create_empty_book() {
  let book = {
    id: generate_id("book"),
    title: "New Book",
    levels: [],
  };
  return book;
}

export function save_editor_book(book) {
  let key = "editor_" + book.id;
  localStorage.setItem(key, JSON.stringify(book, book_replacer));
}

