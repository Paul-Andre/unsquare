import { purchaseDailyWeeklyArchive } from "./shop";

type Continuation = (rest:string[])=>void;

const continuations: Record<string, Continuation> = {
    purchaseDailyWeeklyArchive: (rest) => {
        purchaseDailyWeeklyArchive();
    }
};

function processContinuations(a:string[]) {
    if (a.length == 0) return;
    let name = a[0];
    let cont = continuations[name];
    if (!cont) {
        throw new Error(`Unknown continuation: ${name}`);
    }
    let rest = a.slice(1);
    cont(rest);
    processContinuations(rest);
}

export function handleContinuations() {
    const url = new URL(window.location.href);
    const continuationsString = url.searchParams.get("continuations");
    if (continuationsString) {
        continuationsString.split(",");
        
    }
}