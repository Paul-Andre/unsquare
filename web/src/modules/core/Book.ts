import { Continuation } from './Continuation.ts';
import { Level } from './Level.ts';

export type BookNavigation = {
  action: "offerDailyWeeklyArchive",
  continuations: Continuation[],
}

export type Book = {
  id: string;
  title: string;
  levels: Level[];
  source?: string;
  previous?: BookNavigation;
  next?: BookNavigation;
  fullAmount?: number;
  startDate?: Date;
  seqOffset?: number;
  collapsedInEditor?: boolean;
};