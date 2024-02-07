import * as dotenv from "dotenv";

import { lectio } from "./lectio";
import { calendar } from "./calendar";
import { googleAuthentication } from "./google";
import { listEvents } from "./list";
import { GoogleEvent, ReplacedEvents } from "types";
import { createInterface } from "readline/promises";

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
    
    const [ iEvents, dEvents, rEvents ] = await calendar(authClient, dates, lectioCalendar);
    const affectedEvents = iEvents.length + dEvents.length + rEvents.length;
    const insertedEvents = iEvents.length;
    const deletedEvents = dEvents.length;
    const replacedEvents = rEvents.length;

    const state = affectedEvents > 0 ? `Updated calendar | ${affectedEvents} events affected!` : `Updated calendar`;
    debug(state);
    
    if (affectedEvents > 0) {
        console.log(`- Inserted ${insertedEvents} events`);
        console.log(`- Deleted ${deletedEvents} events`);
        console.log(`- Replaced ${replacedEvents} events`);
    } else {
        console.log(`- ${affectedEvents} events affected!`);
    }
    
    debug(" ");
    
    if (affectedEvents > 0) {
        // const tryInterface = createInterface({ input: process.stdin, output: process.stdout });
        // debug("Open a list with event data? Type 'yes' or 'no'");
    
        // const answer = await tryInterface.question("> ");
        // tryInterface.close();
    
        // debug(" ");
        // if (answer !== "yes") return debug("Registered input as no!");

        await listEvents(iEvents as Array<GoogleEvent>, dEvents as Array<GoogleEvent>, rEvents as Array<ReplacedEvents>);
        // debug("Registered input as yes");
        // debug(" ");
    }

    debug(" ");
    debug(" ");
}

main();
