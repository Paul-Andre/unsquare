import { Level } from './Level.ts';

export type BookPrevious = {
  type: "purchaseArchive"
}

export type Book = {
  id: string;
  title: string;
  levels: Level[];
  source?: string;
  previous?: BookPrevious
  fullAmount?: number
};