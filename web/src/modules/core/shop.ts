import { createCheckoutSession } from "../utils/stripe";
import { ensureAuthenticated } from "../utils/paidFeatures";
import { getCurrentUser } from "../utils/auth";

export async function purchaseDailyWeeklyArchive() {
    await ensureAuthenticated();
    console.log(await getCurrentUser());
    createCheckoutSession({
        price: "price_1ShNdwAVJE8pXXhAfdf3SHTY",
        success_url: window.location.origin + "?continuations=purchaseDailyWeeklyArchive",
    });
}