import { Level } from './Level.ts';

export type BookPrevious = {
  action: "offerDailyWeeklyArchive"
}

export type Book = {
  id: string;
  title: string;
  levels: Level[];
  source?: string;
  previous?: BookPrevious
  fullAmount?: number
};