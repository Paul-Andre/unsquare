import { appContext } from "./AppContext";
import { purchaseDailyWeeklyArchive, purchaseFullAccess } from "../utils/stripe";

// a Continuation is basically a intent or location that is serializable on the URL, and is
// used to redirect or do the correct action after authentication or payment flows.

// For now, continuation is just a string, but it might become a more complex object in the future
type ContinuationFunction = (rest:Continuation[])=>void;

const continuationFunctions: Record<Continuation, ContinuationFunction> = {
    purchaseDailyWeeklyArchive: (rest:Continuation[]) => {
        // When this continuation is processed (e.g., after auth redirect),
        // directly call purchaseDailyWeeklyArchive without authentication
        // since authentication has already been handled
        purchaseDailyWeeklyArchive(rest);
    },
    purchaseFullAccess: (rest:Continuation[]) => {
        purchaseFullAccess(rest);
    },
    goToWeeklyArchive: (rest:Continuation[]) => {
        if (appContext.screenManager.currentScreenName !== "challengeLevelMenu") {
            appContext.goToWeeklyArchive();
        }
    },
    goToDailyArchive: (rest:Continuation[]) => {
        if (appContext.screenManager.currentScreenName !== "gridLevelMenu") {
            appContext.goToDailyArchive();
        }
    },
};
export type Continuation = "purchaseDailyWeeklyArchive" | "purchaseFullAccess" | "goToWeeklyArchive" | "goToDailyArchive";


export function buildUrl(continuations:Continuation[]):string {
    return window.location.origin + "?continuations=" + continuations.map(serializeContinuation).join(",");
}

export function processContinuations(a:Continuation[]) {
    if (a.length == 0) return;
    let name = a[0];
    let rest = a.slice(1);
    let cont = continuationFunctions[name];
    if (!cont) {
        throw new Error(`Unknown continuation: ${name}`);
    }
    cont(rest);
    processContinuations(rest);
}

function parseContinuation(s:string):Continuation {
    switch (s) {
        case "purchaseDailyWeeklyArchive":
            return "purchaseDailyWeeklyArchive";
        case "purchaseFullAccess":
            return "purchaseFullAccess";
        case "goToDailyArchive":
            return "goToDailyArchive";
        case "goToWeeklyArchive":
            return "goToWeeklyArchive";
        default:
            throw new Error(`Unknown continuation during parsing: ${s}`);
    }
}

function serializeContinuation(c:Continuation):string {
    switch (c) {
        case "purchaseDailyWeeklyArchive":
            return "purchaseDailyWeeklyArchive";
        case "purchaseFullAccess":
            return "purchaseFullAccess";
        case "goToDailyArchive":
            return "goToDailyArchive";
        case "goToWeeklyArchive":
            return "goToWeeklyArchive";
        default:
            throw new Error(`Unknown continuation during serialization: ${c}`);
    }
}

export function getUrlContinuations():Continuation[] {
    const url = new URL(window.location.href);
    const continuationsString = url.searchParams.get("continuations");
    if (continuationsString) {
        return continuationsString.split(",").map(parseContinuation);
    }
    return [];
}