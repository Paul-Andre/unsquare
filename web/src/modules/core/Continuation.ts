import { purchaseDailyWeeklyArchive, purchaseFullAccess } from "../utils/stripe";

// a Continuation is basically a intent or location that is serializable on the URL, and is
// used to redirect or do the correct action after authentication or payment flows.


export type Continuation = "purchaseDailyWeeklyArchive" | "purchaseFullAccess" | "goToWeeklyArchive" | "goToDailyArchive";


export function buildUrl(continuations:Continuation[]):string {
    const base = window.location.origin + window.location.pathname;
    return base + "?continuations=" + continuations.map(serializeContinuation).join(",");
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