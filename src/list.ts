import { type GoogleEvent, type ReplacedEvents } from "types";
import { application, BROWSER } from "./google";
import type { Request, Response } from "express";
import { spawn } from "child_process";

function generateEventsString(events: Array<GoogleEvent>) {
    let eventsString = "";

    for (const event of events) {
        const time = typeof event.time === "object" ? `| ${event.time?.start} - ${event.time?.end} ` : "";
        eventsString += `<br/> [ ${event.date} ${time} ] ${event.label} `;
    }

    return eventsString;
}
 
function generateReplaceEventsString(replaces: Array<ReplacedEvents>) {
    const arrow = "<font style='font-weight: bold; font-style: italic;'> → </font>";
    let eventsString = "";

    for (const replace of replaces) {
        const time = typeof replace.deleted.time === "object" ? `| ${replace.deleted.time?.start} - ${replace.deleted.time?.end}` : "";
        const date = typeof replace.deleted.date === "object" ? replace.deleted.date.start : replace.deleted.date;

        let replaceString = `<br/> [ ${date} ${time} `;
        if (typeof replace.inserted.time === "object") {
            if (JSON.stringify(replace.inserted.time) !== JSON.stringify(replace.deleted.time)) {
                replaceString += `${arrow} ${replace.inserted.time?.start} - ${replace.inserted.time?.end} `
            }
        }

        replaceString += `] ${replace.deleted.label} `;
        if (replace.inserted.label !== replace.deleted.label) {
            replaceString += `${arrow} ${replace.inserted.label} `;
        }

        eventsString += replaceString;
    }

    return eventsString;
}

export async function listEvents(iEvents: Array<GoogleEvent>, dEvents: Array<GoogleEvent>, rEvents: Array<ReplacedEvents>) {
    application.get("/list", function (req: Request, res: Response) {
        const affected = iEvents.length + dEvents.length + rEvents.length;
        const information = `
            <strong> Calendar Stats | ${affected} events affected! </strong>
            <br/> Inserted ${iEvents.length} events
            <br/> Deleted ${dEvents.length} events
            <br/> Replaced ${rEvents.length} events
        `;

        const inserted = `<strong> Inserted Events </strong> ${generateEventsString(iEvents)}`;
        const deleted = `<strong> Deleted Events </strong> ${generateEventsString(dEvents)}`;
        const replaced = `<strong> Replaced Events </strong> ${generateReplaceEventsString(rEvents)}`;

        const data = `
            ${information}
            <br/> <br/> <br/> <br/> 

            ${inserted}
            <br/> <br/> <br/>
            ${deleted}
            <br/> <br/> <br/>
            ${replaced}
            <br/> <br/>
        `;

        res.send(data);
    })

    spawn(BROWSER, [ "-new-tab", "http://localhost:3000/list" ])
}