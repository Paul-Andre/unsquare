import { ensureNotNull, generate_id } from 'modules/utils/helpers.ts';
import { Level } from './Level.ts';
import { getCurrentContestId } from './contests.ts';
import { Book } from './Book.ts';
import { book_replacer, book_reviver } from './bookUtils.ts';



function getPrefixFromUrl(): string | null {
    const prefix = new URLSearchParams(window.location.search).get("prefix");
    if (prefix !== null) {
        return prefix;
    }
    return null;
}

function participantNameLskForContest(contestId: string): string {
    return `contest_${contestId}_participant_name`;
}

// "lsk" = local storage key
// Best moves storage methods
function lskForLevelBest(level: Level, contestId: string | null): string {
    if (contestId !== null) {
        return `contest_${contestId} ${level.getFullIdentifier()} bestNumMoves`;
    }
    return `${level.getFullIdentifier()} bestNumMoves`;
}

// AppStorage is a central place for local persistent storage.
// It's called AppStorage to indicate that it contains app-specific logic,
// as opposed to a generic storage class.
// Among other things, having this in one place will make it easier to transition to Capacitor Preferences
// (since localStorage is known to not be reliable in WebViews)
// Some of the storage logic might be implemented differently for different stored information (including
// caching where appropriate to avoid async once Capacitor Preferences are used)
// Currently (2026-06-15), online storage hasn't been figured out yet -- it may or may not involve this class.
// TODO: Consitder extracting generic storage logic to a separate class (if applicable/appropriate considering
// how things will be done with Capacitor Preferences.)
// TODO: Consider perhaps splitting into multiple "repositories" (e.g. EditorBookRepo, LevelBestRepo, etc.)?
export class AppStorage {
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

    // Level best storage methods

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

    checkIfUserHasExperience(): boolean {
        let num_levels_done = 0;
        if (this.prefix !== null) {
            for (let key in localStorage) {
                if (key.startsWith(this.prefix) && key.endsWith("bestNumMoves")) {
                    num_levels_done += 1;
                    if (num_levels_done >= 5) return true;
                }
            }
        } else {
            for (let key in localStorage) {
                if (key.endsWith("bestNumMoves")) {
                    num_levels_done += 1;
                    if (num_levels_done >= 5) return true;
                }
            }
        }   
        return false;
    }

    // TODO: does this belong here, or maybe simply as a global, or as
    // part of some kind of global "context" object instead?
    getPlayerId(): string {
        return this.playerId;
    }

    getParticipantName(): string | null {
        if (this.contestId === null) return null;
        return this.getItem(participantNameLskForContest(this.contestId));
    }

    setParticipantName(name: string): void {
        if (this.contestId === null) throw new Error("Can't set participant name if no contest id.");
        this.setItem(participantNameLskForContest(this.contestId), name);
    }


    // Editor books storage methods

    saveEditorBook(book: Book): void {
        // Note that the book's id already starts with "book_", resulting in a key
        // that starts with "editor_book_".
        let key = "editor_" + book.id;
        book.source = key;
        localStorage.setItem(key, JSON.stringify(book, book_replacer));
    }

    deleteEditorBook(book: Book): void {
        if (book.source) {
            localStorage.removeItem(book.source);
        }
    }
    private fullLskPrefix(subPrefix: string): string {
        if (this.prefix !== null) {
            return `${this.prefix} ${subPrefix}`;
        }
        return subPrefix;
    }

    listEditorBookStrings(): Record<string, string> {
        const fullLskPrefix = this.fullLskPrefix("editor_book_");
        const books: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(fullLskPrefix)) {
                const value = localStorage.getItem(key);
                books[key] = ensureNotNull(value);
            }
        }
        return books;
    }
}

export const appStorage = new AppStorage(getPrefixFromUrl());