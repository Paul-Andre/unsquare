import { Level } from './Level.ts';
import { getCurrentContestId } from './contests.ts';

function localStorageSetMin(key: string, num: number): void {
    let prev = localStorage.getItem(key);
    if (prev !== null) {
        let prevNum = Number(prev);
        if (prevNum <= num) {
            // Do not overwrite better previous score
            return;
        }
    }
    localStorage.setItem(key, num.toString());
}

// "lsk" = local storage key
// Best moves storage methods
export function getLskForBestNumMoves(level: Level, contest_id: string | null): string {
    if (contest_id !== null) {
        return `contest_${contest_id} ${level.getFullIdentifier()} bestNumMoves`;
    }
    return `${level.getFullIdentifier()} bestNumMoves`;
}


// Storage is a central place for persistent storage
export class Storage {

    getLevelBest(level: Level): number | null {
        let sol = localStorage.getItem(getLskForBestNumMoves(level, getCurrentContestId()));
        if (sol === null) return null;
        return Number(sol);
    }

    setLevelBest(level: Level, best: number): void {
        localStorageSetMin(getLskForBestNumMoves(level, getCurrentContestId()), best);
        localStorageSetMin(getLskForBestNumMoves(level, null), best);
    }

    clearLevelBest(level: Level): void {
        localStorage.removeItem(getLskForBestNumMoves(level, getCurrentContestId()));
        localStorage.removeItem(getLskForBestNumMoves(level, null));
    }
}

export const storage = new Storage();