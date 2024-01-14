import * as dotenv from "dotenv";

import { lectio } from "./lectio";
import { calendar } from "./calendar";
import { googleAuthentication } from "./google";
import { listEvents } from "./list";

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
    const [ dateObject, time ] = data.split(" ");
    const dateObjects = dateObject.replaceAll(".", "/").split("/");
    for (const dateIndex in dateObjects) {
        const index = parseInt(dateIndex);
        if (index === 2) continue;

        const object = parseInt(dateObjects[index]);
        if (object < 10) dateObjects[index] = `0${object}`;
    }

    const date = `${dateObjects[0]}/${dateObjects[1]}-${dateObjects[2]}`;
    now = `${date} | ${time.replace(".", ":").slice(0, 5)}`;

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
    
    const [ iEvents, dEvents ] = await calendar(authClient, dates, lectioCalendar);
    const affectedEvents = iEvents.length + dEvents.length;
    const insertedEvents = dEvents.length;
    const deletedEvents = iEvents.length;

    debug("Updated calendar");
    
    if (affectedEvents > 0) {
        console.log(`- Inserted ${insertedEvents} events`);
        console.log(`- Deleted ${deletedEvents} events`);
    }
    
    console.log(`- ${affectedEvents} events affected!`);
    debug(" ");
    
    if (affectedEvents > 0) {
        await listEvents(iEvents, dEvents);
        debug(" ");
    }

    debug(" ");
    debug(" ");
}

main();
