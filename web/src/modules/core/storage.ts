import { generate_id } from 'modules/utils/helpers.ts';
import { Level } from './Level.ts';
import { getCurrentContestId } from './contests.ts';



function getPrefixFromUrl(): string | null {
    const prefix = new URLSearchParams(window.location.search).get("prefix");
    if (prefix !== null) {
        return prefix;
    }
    return null;
}


// "lsk" = local storage key
// Best moves storage methods
function lskForLevelBest(level: Level, contestId: string | null): string {
    if (contestId !== null) {
        return `contest_${contestId} ${level.getFullIdentifier()} bestNumMoves`;
    }
    return `${level.getFullIdentifier()} bestNumMoves`;
}

// Storage is a central place for persistent storage
export class Storage {
    prefix: string | null;
    contestId: string | null;
    playerId: string;

    constructor(prefix: string | null) {
        this.prefix = prefix;
        this.contestId = getCurrentContestId();

        const currentPlayerId = this.getItem("player_id");
        if (currentPlayerId === null) {
            let player_id = generate_id("anon");
            this.setItem("player_id", player_id);
            this.playerId = player_id;
        } else {
            this.playerId = currentPlayerId;
        }
    }

    private getItem(key: string): string | null {
        if (this.prefix !== null) {
            return localStorage.getItem(`${this.prefix} ${key}`);
        }
        return localStorage.getItem(key);
    }

    private setItem(key: string, value: string): void {
        if (this.prefix !== null) {
            localStorage.setItem(`${this.prefix} ${key}`, value);
        }
        localStorage.setItem(key, value);
    }

    private removeItem(key: string): void {
        if (this.prefix !== null) {
            localStorage.removeItem(`${this.prefix} ${key}`);
        }
        localStorage.removeItem(key);
    }

    private setMin(key: string, value: number): void {
        if (this.getItem(key) === null) {
            this.setItem(key, value.toString());
        } else {
            this.setItem(key, Math.min(Number(this.getItem(key)), value).toString());
        }
    }

    getLevelBest(level: Level): number | null {
        let sol = this.getItem(lskForLevelBest(level, this.contestId));
        if (sol === null) return null;
        return Number(sol);
    }

    setLevelBest(level: Level, best: number): void {
        // When a contest is active, we record the best score both for the contest and for the global best.
        this.setMin(lskForLevelBest(level, this.contestId), best);
        this.setMin(lskForLevelBest(level, null), best);
    }

    clearLevelBest(level: Level): void {
        this.removeItem(lskForLevelBest(level, this.contestId));
    }

    // TODO: does this belong here, or maybe simply as a global, or as
    // part of some kind of global "context" object instead?
    getPlayerId(): string {
        return this.playerId;
    }
}

export const storage = new Storage(getPrefixFromUrl());