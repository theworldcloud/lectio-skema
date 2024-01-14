import { createInterface } from "readline/promises";
import type { GoogleEvent } from "types";
import { debug } from "./main";
import { application, BROWSER } from "./google";
import type { Request, Response } from "express";
import { spawn } from "child_process";

function generateEventsString(events: Array<GoogleEvent>) {
    let eventsString = "";

    for (const event of events) {
        const time = typeof event.time === "object" ? `| ${event.time?.start} - ${event.time?.end}` : "";
        eventsString += `<br/> [ ${event.date} ${time} ] ${event.label}`;
    }

    return eventsString;
}
 
export async function listEvents(iEvents: Array<GoogleEvent>, dEvents: Array<GoogleEvent>) {
    const tryInterface = createInterface({ input: process.stdin, output: process.stdout });
    debug("Open a list with event data? Type 'yes' or 'no'");

    const answer = await tryInterface.question("> ");
    tryInterface.close();

    debug(" ");
    if (answer !== "yes") return debug("Registered input as no!");

    application.get("/list", function (req: Request, res: Response) {
        const information = `
            <strong> Calendar Stats </strong>
            <br/> Inserted ${iEvents.length} events
            <br/> Deleted ${dEvents.length} events
            <br/> Affected ${iEvents.length + dEvents.length} events!
        `;

        const inserted = `<strong> Inserted Events </strong> ${generateEventsString(iEvents)}`;
        const deleted = `<strong> Deleted Events </strong> ${generateEventsString(dEvents)}`;

        const data = `
            ${information}
            <br/> <br/> <br/> <br/> 

            ${inserted}
            <br/> <br/> <br/>
            ${deleted}
            <br/> <br/>
        `;

        res.send(data);
    })

    spawn(BROWSER, [ "-new-tab", "http://localhost:3000/list" ])
    debug("Registered input as yes");
}