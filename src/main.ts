import * as dotenv from "dotenv";

import { lectio } from "./lectio";
import { calendar } from "./calendar";
import { googleAuthentication } from "./google";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

let now = "";
dotenv.config();

export function debug(message: string) {
    if (message === " ") return console.log(" ");
    return console.log(`[ ${now} ] ${message}`);
}

async function main() {
    const data = new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
    const [ date, time ] = data.split(" ");
    now = `${date.replace(".", "/").replace(".", "/")} - ${time.replace(".", ":").slice(0, 5)}`;

    debug(" ");
    debug(" ");
    debug(" ");
    debug("Receiving lectio events...");

    const [ lectioCalendar, dates ] = await lectio();
    
    if (lectioCalendar.length === 0) {
        debug("Received no events from lectio?! Maybe an error?!")
        debug(" "); 
        debug(" ");
        debug(" ");

        return;
    } else {
        debug("Received lectio events successfully!");
        debug(" ");
    }

    const authClient = await googleAuthentication();    
    if (authClient === undefined) {
        debug("Failed to authenticate google!")
        debug(" ");
        debug(" ");
        debug(" ");

        return;
    } else {
        debug("Authenticated google successfully!");
        debug(" ");
    }

    debug("Updating calendar...");
    const [ iEvents, dEvents, aEvents ] = await calendar(authClient, dates, lectioCalendar);

    debug("Updated calendar");
    console.log(`- Inserted ${iEvents} events`);
    console.log(`- Deleted ${dEvents} events`);
    console.log(`- ${aEvents} events affected!`);
    debug(" ");
    debug(" ");
    debug(" ");
}

main();
