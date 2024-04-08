import { google, calendar_v3 } from "googleapis";
import { GoogleEvent, LectioEvent, LectioTime, ReplacedEvents } from "./types";

function getDateTime(lectioEvent: LectioEvent) {
    if (lectioEvent.time === "all-day") {
        const [ day, month ] = (lectioEvent.date as string).slice(0, 5).replace("-", "").split("/");
        const year = (lectioEvent.date as string).slice(-4);

        const date = `${year}-${month}-${day}`;
        return [ date, date ];
    } else {
        if (typeof lectioEvent.date === "string") {
            const [ startHours, startMinutes ] = (lectioEvent.time.start as string).split(":");
            const [ endHours, endMinutes ] = (lectioEvent.time.end as string).split(":");

            const [ day, month ] = (lectioEvent.date as string).slice(0, 5).replace("-", "").split("/");
            const year = (lectioEvent.date as string).slice(-4);

            const date = new Date();
            date.setFullYear(parseInt(year));
            date.setMonth(parseInt(month) - 1);
            date.setUTCMonth(parseInt(month) - 1);
            date.setDate(parseInt(day));

            const startDate = new Date(date);
            const endDate = new Date(date);

            startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
            endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            return [ startDate.toISOString(), endDate.toISOString() ];
        } else {
            const [ startHours, startMinutes ] = (lectioEvent.time.start as string).split(":");
            const [ endHours, endMinutes ] = (lectioEvent.time.end as string).split(":");

            const [ startDay, startMonth ] = (lectioEvent.date.start as string).slice(0, 5).replace("-", "").split("/");
            const [ endDay, endMonth ] = (lectioEvent.date.end as string).slice(0, 5).replace("-", "").split("/");

            const startYear = (lectioEvent.date.start as string).slice(-4);
            const endYear = (lectioEvent.date.end as string).slice(-4);

            const startDate = new Date();
            const endDate = new Date();
            
            startDate.setFullYear(parseInt(startYear));
            startDate.setMonth(parseInt(startMonth) - 1);
            startDate.setDate(parseInt(startDay));
            startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

            endDate.setFullYear(parseInt(endYear));
            endDate.setMonth(parseInt(endMonth) - 1);
            endDate.setDate(parseInt(endDay));
            endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            return [ startDate.toISOString(), endDate.toISOString() ];
        }
    }
}

async function insertEvents(googleCalendar: calendar_v3.Calendar, lectioEvents: Array<LectioEvent>) {
    for (const lectioEvent of lectioEvents) {
        if (lectioEvent === undefined) continue;

        const [ start, end ] = getDateTime(lectioEvent);
        const googleEvent:calendar_v3.Schema$Event = {
            summary: `${lectioEvent.label}`,
            description: "Svendborg Gymnasium",
            colorId: "2",
            transparency: lectioEvent.available === false ? "opaque" : "transparent",
            status: lectioEvent.cancelled === true ? "cancelled" : "confirmed",
        }

        if (lectioEvent.time === "all-day") {
            googleEvent.reminders = { useDefault: false, overrides: [ { method: "popup", minutes: 30 } ] };

            googleEvent.start = { timeZone: "Europe/Copenhagen", date: start };
            googleEvent.end = { timeZone: "Europe/Copenhagen", date: end };
        } else {
            googleEvent.reminders = { useDefault: false, overrides: [ { method: "popup", minutes: 5 } ] };

            googleEvent.start = { timeZone: "Europe/Copenhagen", dateTime: start };
            googleEvent.end = { timeZone: "Europe/Copenhagen", dateTime: end };
        }

        if ((lectioEvent.locations).length > 0) {
            const label = (lectioEvent.locations).length > 1 ? "Lokaler:" : "Lokale:" ;
            googleEvent.location = `${label} ${lectioEvent.locations.join(", ")}`;
        }

        if ((lectioEvent.teachers).length > 0) {
            const label = (lectioEvent.teachers).length > 1 ? "Lærere:" : "Lærer:" ;
            googleEvent.description += `\n${label} ${lectioEvent.teachers.join(", ")}`;
        }

        if (lectioEvent.notes !== undefined) {
            googleEvent.description += `\n\nNoter:\n${lectioEvent.notes}`;
        }

        if (lectioEvent.homework !== undefined) {
            googleEvent.description += `\n\nLektier:\n${lectioEvent.homework}`;
        }

        await googleCalendar.events.insert({ calendarId: process.env.GOOGLE_CALENDAR, requestBody: googleEvent });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

async function deleteEvents(googleCalendar: calendar_v3.Calendar, googleEvents: Array<GoogleEvent>) {
    for (const googleEvent of googleEvents) {
        await googleCalendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR, eventId: googleEvent.id });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return;
}

function findEndofInformation(lines: Array<string>, start: number) {
    function isNextLineStarting(line: string) {
        const nextLines = [ "hold:", "lærer:", "læerere:", "lokale:", "lokaler:", "lektier:", "note:", "indhold:" ];
        
        for (const nextLine of nextLines) {
            if ((line.toLowerCase()).includes(nextLine) === true) return true;
        }

        return false;
    }

    for (let index = start; index < lines.length; index++) {
        const isEnd = lines[index + 1] === undefined || isNextLineStarting(lines[index + 1]);
        const isLineEnd = isNextLineStarting(lines[index]) === false;

        if (lines[index].length === 0 && isEnd && isLineEnd) {
            return index;
        }
    }

    return lines.length;
}

function getEventData(googleEvent: calendar_v3.Schema$Event) {
    let date: string | LectioTime = undefined as any;
    let time: "all-day" | LectioTime = undefined as any;

    if (googleEvent.start!.date !== undefined) {
        const [ startYear, startMonth, startDay ] = googleEvent.start!.date!.split("-");
        const [ endYear, endMonth, endDay ] = googleEvent.end!.date!.split("-");

        const startDate = `${startDay}/${startMonth}-${startYear}`;
        const endDate = `${endDay}/${endMonth}-${endYear}`;

        if (startDate === endDate) {
            date = startDate;
        } else {
            date = { start: startDate, end: endDate };
        }

        time = "all-day";
    } else {
        const startData = googleEvent.start!.dateTime!.split("T");
        const endData = googleEvent.end!.dateTime!.split("T");

        const [ startYear, startMonth, startDay ] = startData[0].split("-");
        const [ endYear, endMonth, endDay ] = endData[0].split("-");

        const startDate = `${startDay}/${startMonth}-${startYear}`;
        const endDate = `${endDay}/${endMonth}-${endYear}`;

        if (startDate === endDate) {
            date = startDate;
        } else {
            date = { start: startDate, end: endDate };
        }

        const [ startHours, startMinutes ] = startData[1].split("+")[0].split(":");
        const [ endHours, endMinutes ] = endData[1].split("+")[0].split(":");

        time = { start: `${startHours}:${startMinutes}`, end: `${endHours}:${endMinutes}` };
    }

    const description = googleEvent.description!.split("\n").slice(1);
    const available = googleEvent.transparency === "transparent" ? true : false;
    const locations = googleEvent.location !== undefined ? googleEvent.location!.split(": ")[1].split(", ") : [];

    let teachers: Array<string> = [];
    let notes: string | undefined = undefined;
    let homework: string | undefined = undefined;

    for (const index in description) {
        const lineIndex = parseInt(index);
        const line = description[lineIndex];
        
        if (line.includes("Lærer:") || line.includes("Lærere:")) {
            teachers = line.split(": ")[1].split(", ");
            continue;
        }

        if (line.includes("Noter:")) {
            const notesEnd = findEndofInformation(description, lineIndex + 1);
            const notesData = description.slice(lineIndex + 1, notesEnd);
            notes = notesData.join("\n");
        }

        if (line.includes("Lektier:") && homework === undefined) {
            const homeworkEnd = findEndofInformation(description, lineIndex + 1);
            const homeworkData = description.slice(lineIndex + 1, homeworkEnd);
            homework = homeworkData.join("\n");
        }
    }

    const eventData: LectioEvent = {
        label: googleEvent.summary!,
        date: date, 
        time: time,

        cancelled: false,
        available: available,
        
        locations: locations,
        teachers: teachers,
        notes: notes,
        homework: homework,
    }

    return eventData;
}

function checkDateTime(lectioEvent: LectioEvent, googleEvent: LectioEvent) {
    let cDate: boolean = false;
    let cTime: boolean = false;

    if (typeof lectioEvent.date === typeof googleEvent.date) {
        if (typeof lectioEvent.date === "string" && typeof googleEvent.date === "string") {

            if (lectioEvent.date === googleEvent.date) {
                cDate = true;
            } else {
                cDate = false;
            }
        } else {
            const startDate = (lectioEvent.date as LectioTime).start === (googleEvent.date as LectioTime).start;
            const endDate = (lectioEvent.date as LectioTime).end === (googleEvent.date as LectioTime).end;

            if (startDate === true && endDate === true) {
                cDate = true;
            } else {
                cDate = false;
            }
        }
    } else {
        cDate = false;
    }

    if (typeof lectioEvent.time === typeof googleEvent.time) {
        if (typeof lectioEvent.time === "string" && typeof googleEvent.time === "string") {
            if (lectioEvent.time === googleEvent.time) {
                cTime = true;
            } else {
                cTime = false;
            }
        } else {
            const startTime = (lectioEvent.time as LectioTime).start === (googleEvent.time as LectioTime).start;
            const endTime = (lectioEvent.time as LectioTime).end === (googleEvent.time as LectioTime).end;

            if (startTime === true && endTime === true) {
                cTime = true;
            } else {
                cTime = false;
            }
        }
    } else {
        cTime = false;
    }

    if (cDate === true && cTime === true) {
        return true;
    } else {
        return false;
    }
}

export async function calendar(authClient: any, dates: Array<string>, lectioCalendar: Array<LectioEvent>): Promise<Array<Array<GoogleEvent | ReplacedEvents>>> {
    const GOOGLE_CALENDAR = process.env.GOOGLE_CALENDAR;
    const googleCalendar = google.calendar({ version: "v3", auth: authClient });

    const googleEventData = await googleCalendar.events.list({ orderBy: "startTime", singleEvents: true, maxResults: 2500, calendarId: GOOGLE_CALENDAR, timeMin: dates[0], timeMax: dates[1] });
    if (googleEventData.data.items === undefined) return [ [], [] ];

    const googleEvents = (googleEventData.data.items);
    const lectioEvents = lectioCalendar.filter((event) => event.cancelled === false);

    const rEvents: Array<LectioEvent> = [ ... lectioEvents ];
    let iEvents: Array<LectioEvent> = [ ... lectioEvents ];
    let dEvents: Array<GoogleEvent> = [];

    for (const googleEIndex in googleEvents) {
        const googleIndex = parseInt(googleEIndex);
        const googleEventData = googleEvents[googleIndex];

        const googleEvent = getEventData(googleEventData);

        const lectioIndex = lectioEvents.findIndex((event) => 
            event.label === googleEventData.summary && checkDateTime(event, googleEvent) === true);

        const dEventInfo: GoogleEvent = {
            id: googleEventData.id!, 
            label: googleEventData.summary!
        }

        if (googleEventData.start?.timeZone !== undefined && googleEventData.end?.timeZone !== undefined) {
            let [ startDate, startTime ] = (googleEventData.start.dateTime as string).split("T");
            startDate = startDate.split("-").reverse().join("-").replace("-", "/");
            startTime = startTime.split(":00+")[0];

            let [ endDate, endTime ] = (googleEventData.end.dateTime as string).split("T");
            endDate = endDate.split("-").reverse().join("-").replace("-", "/");
            endTime = endTime.split(":00+")[0];

            if (startDate === endDate) {
                dEventInfo.date = startDate;
            } else {
                dEventInfo.date = { start: startDate, end: endDate };
            }

            dEventInfo.time = { start: startTime, end: endTime };
        } else {
            const startDate = (googleEventData.start?.date as string).split("-").reverse().join("-").replace("-", "/");
            const endDate = (googleEventData.end?.date as string).split("-").reverse().join("-").replace("-", "/");

            if (startDate === endDate) {
                dEventInfo.date = startDate;
            } else {
                dEventInfo.date = { start: startDate, end: endDate };
            }

            dEventInfo.time = "all-day";            
        }

        if (lectioIndex === -1) {
            dEvents.push(dEventInfo);
            continue;
        }

        const lectioEvent = lectioEvents[lectioIndex];
        const eventIndex = rEvents.findIndex((event) => 
            event.label === lectioEvent.label && checkDateTime(event, googleEvent) === true);

        if (lectioEvent.label === googleEvent.label && checkDateTime(lectioEvent, googleEvent) === true) {
            if ((lectioEvent.locations).join(", ") === (googleEvent.locations).join(", ")) {
                if ((lectioEvent.teachers).join(", ") === (googleEvent.teachers).join(", ")) {
                    if (lectioEvent.notes === googleEvent.notes) {
                        if (lectioEvent.homework === googleEvent.homework) {
                            delete iEvents[eventIndex];
                            continue;
                        } else {
                            dEvents.push(dEventInfo);
                            continue;
                        }
                    } else {
                        dEvents.push(dEventInfo);
                        continue;
                    }
                } else {
                    dEvents.push(dEventInfo);
                    continue;
                }
            } else {
                dEvents.push(dEventInfo);
                continue;
            }
        }
    }

    iEvents = iEvents.filter(event => event !== undefined);
    dEvents = dEvents.filter(event => event !== undefined);

    let iEventsShort: Array<GoogleEvent> = [];
    iEvents.map(event => iEventsShort.push({ id: "none", label: event.label, date: event.date, time: event.time }));

    await deleteEvents(googleCalendar, dEvents);
    await insertEvents(googleCalendar, iEvents);

    const replaceEvents: Array<ReplacedEvents> = [];
    const removeEvents: Record<string, Array<number>> = {
        insert: [],
        delete: []
    }

    for (const iEventIndexString in iEventsShort) {
        const iEventIndex = parseInt(iEventIndexString);
        const iEvent = iEventsShort[iEventIndex];

        const dEventIndex = await dEvents.findIndex((event) => checkEvent(iEvent, event) === true);
        const dEvent = dEvents[dEventIndex];

        if (dEventIndex !== -1) {
            replaceEvents.push({ deleted: dEvent, inserted: iEvent });

            removeEvents.insert.push(iEventIndex);
            removeEvents.delete.push(dEventIndex);
        }
    }

    Object.keys(removeEvents).map((type) => removeEvents[type] = removeEvents[type].reverse());
    removeEvents.insert.map((index) => delete iEventsShort[index]);
    removeEvents.delete.map((index) => delete dEvents[index]);

    iEventsShort = iEventsShort.filter((event) => event !== undefined);
    dEvents = dEvents.filter((event) => event !== undefined);

    return [ iEventsShort, dEvents, replaceEvents ];
}

function checkEvent(iEvent: GoogleEvent, dEvent: GoogleEvent) {
    function checkWithTime(iEvent: string, dEvent: string) {
        const [ iEventLabel, iEventDesc ] = iEvent.split(" | ");
        const [ dEventLabel, dEventDesc ] = dEvent.split(" | ");

        const [ iEventClass, iEventTeam ] = iEventLabel.split(" ");
        const [ dEventClass, dEventTeam ] = dEventLabel.split(" ");

        if ((!iEventClass && !iEventTeam) || (!dEventClass && !dEventTeam)) return false;
        if (iEventClass === dEventClass && iEventTeam === dEventTeam) return true;
        return false;
    }

    function checkWithDay(iEvent: string, dEvent: string) {
        if (iEvent !== dEvent) return true;
        return false;
    }

    if (typeof iEvent.time === "string" && typeof dEvent.time === "string") {
        if (checkWithDay(iEvent.label, dEvent.label) && JSON.stringify(iEvent.date) === JSON.stringify(dEvent.date)) {
            if (JSON.stringify(iEvent.time) !== JSON.stringify(dEvent.time)) {
                return true;
            }
    
            if (JSON.stringify(iEvent.time) === JSON.stringify(dEvent.time)) {
                return true;
            }
    
            return false;
        }
    } else {
        if (checkWithTime(iEvent.label, dEvent.label) && JSON.stringify(iEvent.date) === JSON.stringify(dEvent.date)) {
            if (JSON.stringify(iEvent.time) !== JSON.stringify(dEvent.time)) {
                return true;
            }
    
            if (JSON.stringify(iEvent.time) === JSON.stringify(dEvent.time)) {
                return true;
            }
    
            return false;
        }
    }
    
    return false;
}