import { appContext } from "./AppContext";
import { purchaseDailyWeeklyArchive, purchaseFullAccess } from "../utils/stripe";
import { Continuation } from "./Continuation";

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
        appContext.screenManager.switchTo("mainLevelMenu");
        appContext.goToWeeklyArchive();
    },
    goToDailyArchive: (rest:Continuation[]) => {
        appContext.screenManager.switchTo("mainLevelMenu");
        appContext.goToDailyArchive();
    },
};

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