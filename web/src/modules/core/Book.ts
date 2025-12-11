import { Level } from './Level.ts';

export type Book = {
  id: string;
  title: string;
  levels: Level[];
  source?: string;
};