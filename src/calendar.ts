import { google, calendar_v3 } from "googleapis";
import { LectioCalendar, LectioEvent } from "./types";
import { googleAuthentication } from "./google";

function getDateTime(lectioEvent: LectioCalendar) {
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

async function insertEvents(googleCalendar: calendar_v3.Calendar, lectioEvents: Array<LectioCalendar>) {
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

async function deleteEvents(googleCalendar: calendar_v3.Calendar, googleEvents: Array<string>) {
    for (const googleEvent of googleEvents) {
        await googleCalendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR, eventId: googleEvent });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return;
}

function findInformation(description: Array<string>) {
    if (description.length > 1) {
        if (description.includes("") === true) {
            const index = description.findIndex((line) => line === "");
            return description.slice(0, index);
        }

        return description.slice(0, description.length);
    }

    return description.slice(0, description.length);
}

function getEventData(googleEvent: calendar_v3.Schema$Event) {
    let date: string | LectioEvent = undefined as any;
    let time: "all-day" | LectioEvent = undefined as any;

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
            const notesData = findInformation(description.slice(lineIndex + 1));
            notes = notesData.join("\n");
        }

        if (line.includes("Lektier:")) {
            const homeworkData = findInformation(description.slice(lineIndex + 1));
            homework = homeworkData.join("\n");
        }
    }

    const eventData: LectioCalendar = {
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

function checkDateTime(lectioEvent: LectioCalendar, googleEvent: LectioCalendar) {
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
            const startDate = (lectioEvent.date as LectioEvent).start === (googleEvent.date as LectioEvent).start;
            const endDate = (lectioEvent.date as LectioEvent).end === (googleEvent.date as LectioEvent).end;

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
            const startTime = (lectioEvent.time as LectioEvent).start === (googleEvent.time as LectioEvent).start;
            const endTime = (lectioEvent.time as LectioEvent).end === (googleEvent.time as LectioEvent).end;

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

export async function calendar(authClient: any, dates: Array<string>, lectioCalendar: Array<LectioCalendar>) {
    const GOOGLE_CALENDAR = process.env.GOOGLE_CALENDAR;
    const googleCalendar = google.calendar({ version: "v3", auth: authClient });

    const googleEventData = await googleCalendar.events.list({ maxResults: 2500, calendarId: GOOGLE_CALENDAR, timeMin: dates[0], timeMax: dates[1] });
    if (googleEventData.data.items === undefined) return [ 0, 0, 0 ];

    const googleEvents = (googleEventData.data.items).filter((event) => (event.description)?.includes("Svendborg Gymnasium"));
    const lectioEvents = lectioCalendar.filter((event) => event.cancelled === false);

    const rEvents: Array<LectioCalendar> = [ ... lectioEvents ];
    const iEvents: Array<LectioCalendar> = [ ... lectioEvents ];
    const dEvents: Array<string> = [];

    for (const googleEIndex in googleEvents) {
        const googleIndex = parseInt(googleEIndex);
        const googleEventData = googleEvents[googleIndex];
        const googleEvent = getEventData(googleEventData);

        const lectioIndex = lectioEvents.findIndex((event) => 
            event.label === googleEventData.summary && checkDateTime(event, googleEvent) === true);

        if (lectioIndex === -1) {
            dEvents.push(googleEventData.id!);
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
                            dEvents.push(googleEventData.id!);
                            continue;
                        }
                    } else {
                        dEvents.push(googleEventData.id!);
                        continue;
                    }
                } else {
                    dEvents.push(googleEventData.id!);
                    continue;
                }
            } else {
                dEvents.push(googleEventData.id!);
                continue;
            }
        }
    }

    await deleteEvents(googleCalendar, dEvents);
    await insertEvents(googleCalendar, iEvents);
    
    return [ (iEvents.filter(event => event.label)).length, dEvents.length, (iEvents.filter(event => event.label)).length + dEvents.length ];
}