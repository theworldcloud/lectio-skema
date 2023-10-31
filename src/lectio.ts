import { LectioInformation, LectioTeams, LectioEvent, LectioTime, IGNORED_EVENTS, TEAM, CLASS } from "./types";

async function getLectioInformation(): Promise<LectioInformation | undefined> {
    const site = await fetch(`https://www.lectio.dk/lectio/${process.env.LECTIO}/login.aspx`);
    const html = await site.text();

    const validationElement = html.split("\n").find((line) => line.includes("__EVENTVALIDATION"));
    if (validationElement === undefined) return undefined;

    const validationAttributes = validationElement.split(" ");
    const eventValidation = validationAttributes[validationAttributes.length - 2].replace("value=\"", "").replace("\"", "");
    
    const cookies = site.headers.get("set-cookie")?.split(";") ?? [];
    const cookie = cookies.find((c) => c.includes("ASP.NET_SessionId"))?.split("ASP.NET_SessionId=")[1] ?? "";

    return {
        eventValidation: eventValidation,
        sessionIdentifier: cookie
    }
}

function generateLectioCredentials(eventValidation: string): FormData {
    const formdata = new FormData();
    const username = atob(process.env.LECTIO_USERNAME ?? "");
    const password = atob(process.env.LECTIO_PASSWORD ?? "");

    formdata.append("m$Content$username", username ?? "");
    formdata.append("m$Content$password", password ?? "");
    formdata.append("m$Content$passwordHidden", password ?? "");
    formdata.append("__EVENTVALIDATION", eventValidation);
    formdata.append("__EVENTTARGET", "m$Content$submitbtn2");
    formdata.append("__EVENTARGUMENT", "");
    formdata.append("masterfootervalue", "X1!ÆØÅ");
    formdata.append("LectioPostbackId", "");

    return formdata;
}

async function lectioFetch(url: string, lectioInformation: LectioInformation): Promise<string> {
    const res = await fetch(`https://www.lectio.dk/lectio/${process.env.LECTIO}/${url}`, {
        method: "POST",
        headers: { "Cookie": `ASP.NET_SessionId=${lectioInformation.sessionIdentifier}` },
        body: generateLectioCredentials(lectioInformation.eventValidation),
        redirect: "follow"
    });

    return await res.text();
}

async function getLectioTeams(lectioInformation: LectioInformation): Promise<LectioTeams | undefined> {
    const lectioTeams: LectioTeams = {};
    const site = await lectioFetch("login.aspx?prevurl=FindSkema.aspx?type=hold", lectioInformation);
    const elements = site.split("\n");
   
    const teamElements = elements.filter((element: string) => element.includes("class='findskema-symbol'"));
    for (const element of teamElements) {
        const teamElement = element.split("</span>");
        const teamLabel = teamElement[0][teamElement[0].length - 2] + teamElement[0][teamElement[0].length - 1];
        const teamName = teamElement[1].replace(" ", "").replace("</a></li>\r", "");

        lectioTeams[teamLabel.toUpperCase()] = teamName;
    }

    lectioTeams["GE"] = "Geografi";
    lectioTeams["STM"] = "Klassetime";
    lectioTeams["VRK"] = "Klassetime";
    lectioTeams["KT"] = "Klassetime";
    lectioTeams["PP1"] = "Projekt- og praktikperiode 1";
    lectioTeams["PP2"] = "Projekt- og praktikperiode 2";
    lectioTeams["PP3"] = "Projekt- og praktikperiode 3";

    return lectioTeams;
}

function getDates(): Array<string> {
    const dates = [];
    const millisecs = 86400000;

    const now = new Date();
    const date = new Date(now.getFullYear(), 0, 1);

    let weekDate = Math.ceil((((now.getTime() - date.getTime()) / millisecs) + date.getDay() + 1) / 7) - 1;
    let year = date.getFullYear();
    
    for (let index = 0; index <= 2; index++) {
        if (weekDate === 0) year = year + 1;
        weekDate = weekDate + 1;

        const week = weekDate > 9 ? weekDate.toString() : "0" + weekDate.toString();
        dates.push(week + year.toString());

        if (weekDate >= 52) weekDate = 0;
    }

    return dates;
}

function getGoogleDates(dates: Array<string>) {
    const googleDates: Array<Date> = [];

    for (const date of dates) {
        const week = parseInt(date.substring(0, 2));
        const year = parseInt(date.substring(2, 6));

        const day = 1 + (week - 1) * 7;
        const googleDate = new Date(year, 0, day + 1);

        googleDates.push(googleDate)
    }

    googleDates[1].setDate(googleDates[1].getDate() + 7);
    return googleDates;
}

function getLectioYear(elements: Array<string>) {
    const start = elements.findIndex((element: string) => element.includes("s2weekHeader"));
    elements = elements.slice(start, elements.length);

    const end = elements.findIndex((element: string) => element.includes("</tr>"));
    elements = elements.slice(1, end);

    let year = 0;
    for (let element of elements) {
        const start = element.indexOf(">");
        element = element.slice(start + 1, element.length);

        const end = element.indexOf("<");
        element = element.slice(0, end);

        if (element.length === 0) continue;
        element = (element.toLowerCase()).replace("uge ", "");

        const data = element.split(" - ");
        year = parseInt(data[1]);
    }

    return [ year, end + start ];
}

function getLectioDates(elements: Array<string>) {
    const start = elements.findIndex((element: string) => element.includes("s2dayHeader"));
    elements = elements.slice(start, elements.length);

    const end = elements.findIndex((element: string) => element.includes("</tr>"));
    elements = elements.slice(1, end);

    const dates: Array<string> = [];
    for (let element of elements) {
        const start = element.indexOf(">");
        element = element.slice(start + 1, element.length);

        const end = element.indexOf("<");
        element = element.slice(0, end);

        if (element.length === 0) continue;
        const index = element.indexOf("(");
        element = element.slice(index + 1, element.length - 1);

        const date = element.split("/");
        date.forEach((d, i) => date[i] = parseInt(d) > 9 ? d : "0" + d);

        dates.push(date.join("/"));
    }

    return [ dates, end + start ];
}

function getLectioEventsHTML(elements: Array<string>) {
    const end = elements.findIndex((element: string) => element.includes("</tr>"));
    elements = elements.slice(2, end);

    const events: Array<Array<string>> = [];
    let eventIndex = 0;

    function findEndofAdditionalInfo(element: Array<string>, start: number) {
        for (let index = start; index <= element.length; index++) {
            if (element[index].includes(`'>`) === true || element[index].includes(`">`) === true) {
                return index;
            }
        }
    }

    for (const i in elements) {
        const index = parseInt(i);
        const element = elements[index];
        if (events[eventIndex] === undefined) events[eventIndex] = [];
        
        if (element.includes("data-additionalInfo=") === true) {
            const end = findEndofAdditionalInfo(elements, index + 1);
            if (end === undefined) continue;

            const additionalInfo = elements.slice(index, end + 1);
            additionalInfo.map((info: string, key: number) => additionalInfo[key] = info.replaceAll("\r", ""));
            additionalInfo.map((info: string, key: number) => additionalInfo[key] = info.replaceAll("\t", ""));


            const dataInfo = additionalInfo[0].includes(`data-additionalInfo="`) === true ? `data-additionalInfo="` : `data-additionalInfo='`; 
            additionalInfo[0] = additionalInfo[0].split(dataInfo)[1];


            const dataEnd = additionalInfo[additionalInfo.length - 1].includes(`">`) === true ? `">` : `'>`;
            additionalInfo[additionalInfo.length - 1] = additionalInfo[additionalInfo.length - 1].split(dataEnd)[0];


            events[eventIndex].push(additionalInfo.join("\n"));
        }

        if (element.includes("</td>") === true) eventIndex++;
    }

    return [ events, end ];
}

function isState(state: string) {
    if (state === "Aflyst!") return true;
    if (state === "Ændret!") return true;

    return false;
}

function isTime(time: string) {
    if (time.includes(":") === false) return false;
    if (time.includes("-") === false) return false;
    if (/[a-zA-Z]/.test(time) === true) return false;
    
    return true;
}

function isLabel(label: string) {
    label = label.toLowerCase();
    if (isTime(label) === true) return false;
    if (isState(label) === true) return false;
    if (label.includes("lærer:") === true || label.includes("lærere:") === true) return false;
    if (label.includes("lokale:") === true || label.includes("lokaler:") === true) return false;
    if (label.includes("hold:") === true) return false;
    if (label.includes("lektier:") === true) return false;
    if (label.includes("note:") === true) return false;

    return true;
}

function isAvailable(label: string): boolean {
    label = label.toLowerCase();
    
    if (label.includes(CLASS) === true) return false;
    if (label.includes(TEAM) === true) return false;
    if (label.includes("morgensamling") === true) return false;
    if (label.includes("studievejledning") === true) return false;
    if (label.includes("ekskursion") === true) return false;
    if (label.includes("samtale") === true) return false;
    if (label.includes("møde") === true) return false;

    return true;
}

function getLectioEventsInformation(teams: LectioTeams, date: string, days: Array<string>, times: Array<string>): Array<LectioEvent> {
    const dayEvents:Array<LectioEvent> = [];
    const timeEvents:Array<LectioEvent> = [];

    function findEndofInformation(lines: Array<string>, start: number) {
        for (let index = start; index < lines.length; index++) {
            if (lines[index].length === 0) {
                return index;
            }
        }

        return lines.length;
    }

    for (const day of days) {
        if ((day.toLowerCase()).includes("hele dagen") === false) continue;

        let isIgnored = false;
        for (const IGNORED_EVENT of IGNORED_EVENTS) {
            if ((day).toLowerCase().includes(IGNORED_EVENT) === true) {
                isIgnored = true;
                break;
            }
        }

        if (isIgnored === true) continue;
        const lines = day.split("\n");
        dayEvents.push({
            label: lines[0],
            date: date,
            time: "all-day",

            available: true,
            cancelled: false,

            teachers: [],
            locations: [],
            notes: undefined,
            homework: undefined
        });
    }

    for (const time of times) {
        const lines = time.split("\n");
        const event: LectioEvent = {} as any;

        event.date = date;
        event.cancelled = false;

        for (const i in lines) {
            const index = parseInt(i);
            const line = lines[index];
    
            if (isState(line) === true) {
                if (line.includes("Aflyst!") === true) event.cancelled = true;
                
                delete lines[index];
                continue;
            }
    
            if (isTime(line) === true) {
                const time = line.split(" - ");
                event.time = { start: time[0], end: time[1] };

                delete lines[index];
                continue;
            }
    
            if ((line.toLowerCase()).includes("lærer:") === true) {
                const data = line.split(" ");
                const teacher = data[data.length - 1].replace("(", "").replace(")", "");
                event.teachers = [ teacher ];

                delete lines[index];
                continue;
            }
    
            if ((line.toLowerCase()).includes("lærere:") === true) {
                const data = line.split("Lærere: ")[1];
                const teachers = data.split(", ");
                event.teachers = teachers;

                delete lines[index];
                continue;
            }
    
            if ((line.toLowerCase()).includes("lokale:") === true) {
                const location = line.split(" ")[1];
                event.locations = [ location ];

                delete lines[index];
                continue;
            }
    
            if ((line.toLowerCase()).includes("lokaler:") === true) {
                const data = line.split("Lokaler: ")[1];
                const locations = data.split(", ");
                event.locations = locations;

                delete lines[index];
                continue;
            }
    
            if ((line.toLowerCase()).includes("lektier:") === true) {
                const end = findEndofInformation(lines, index + 1);
                const homework = lines.slice(index + 1, end).join("\n");
                event.homework = homework;

                for (let del = index; del <= end; del++) {
                    delete lines[del];
                }

                continue;
            }

            if ((line.toLowerCase()).includes("note:") === true) {
                const end = findEndofInformation(lines, index + 1);
                const note = lines.slice(index + 1, end).join("\n");
                event.notes = note;

                for (let del = index; del <= end; del++) {
                    delete lines[del];
                }
                
                continue;
            }

            if ((line.toLowerCase()).includes("hold:") === true) {                
                if ((line.toLowerCase()).includes("alle") === true) {
                    delete lines[index];
                    continue;
                }
    
                const data = line.split("Hold: ")[1];
                const lecs = data.split(", ");
    
                if (lecs.length > 1) {
                    delete lines[index];
                    continue;
                }
    

                const lec = lecs[0];
                if (lec.includes(TEAM) === false && lec.includes(CLASS) === false) {
                    delete lines[index];
                    continue;
                }

                const [ team, lection ] = lec.split(" ");
                if (lection.includes("-") === true) {
                    const subLection = lection.split("-")[1];

                    if (teams[(subLection.toUpperCase()) as any] === undefined) {
                        delete lines[index];
                        continue;
                    }

                    event.label = `${team.toLowerCase()} ${lection.toLowerCase()} (${teams[(subLection.toUpperCase()) as any]})`;
                    delete lines[index];
                    continue;
                }

                if (teams[(lection.toUpperCase()) as any] === undefined) {
                    delete lines[index];
                    continue;
                }

                event.label = `${team.toLowerCase()} ${lection.toLowerCase()} (${teams[(lection.toUpperCase()) as any]})`;
                delete lines[index];
                continue;
            }
        }

        
        const label = lines.filter((line) => line !== "" && line !== undefined)[0];
        if (label !== undefined) {
            if (isLabel(label) === true) {
                if (event.label === undefined) {
                    event.label = label;
                } else {
                    event.label += ` | ${label}`;
                }
            }
        }

        if (event.teachers === undefined) event.teachers = [];
        if (event.locations === undefined) event.locations = [];
        if (event.homework === undefined) event.homework = undefined;
        if (event.notes === undefined) event.notes = undefined;
        
        if (event.label !== undefined) {
            event.available = isAvailable(event.label);

            let isIgnored = false;
            for (const IGNORED_EVENT of IGNORED_EVENTS) {
                if (((event.label).toLowerCase()).includes(IGNORED_EVENT) === true) {
                    isIgnored = true;
                }
            }

            if (isIgnored === false) {
                timeEvents.push(event);
            }
        }
    }

    return [ ...dayEvents, ...timeEvents ];
}

async function getLectioEvents(information: LectioInformation, teams: LectioTeams, date: string) {
    const site = await lectioFetch(`login.aspx?prevurl=SkemaNy.aspx?week=${date}`, information);
    const htmlElements = site.split("\n");

    const startCalendar = htmlElements.findIndex((element: string) => element.includes("s_m_Content_Content_SkemaNyMedNavigation_skemaprintarea"));
    const endCalendar = htmlElements.findIndex((element: string) => element.includes("</table>"));
    let elements = htmlElements.slice(startCalendar, endCalendar);

    const [ year, yearSlice ] = getLectioYear(elements);
    elements = elements.slice(yearSlice as number + 1, elements.length);

    const [ dates, dateSlice ] = getLectioDates(elements);
    elements = elements.slice(dateSlice as number + 1, elements.length);

    (dates as Array<string>).forEach((date: string, index: number) => (dates as Array<string>)[index] += `-${year}`);

    const [ dayEvents, daySlice ] = getLectioEventsHTML(elements);
    elements = elements.slice(daySlice as number + 1, elements.length);

    const [ timeEvents, timeSlice ] = getLectioEventsHTML(elements);
    elements = elements.slice(timeSlice as number + 1, elements.length);

    const events: Array<LectioEvent> = [];
    for (const i in dates as Array<string>) {
        const index = parseInt(i);
        const date = (dates as Array<string>)[index];
        const day = (dayEvents as Array<Array<string>>)[index];
        const time = (timeEvents as Array<Array<string>>)[index];   

        const eventsInformation: Array<LectioEvent> = getLectioEventsInformation(teams, date, day, time);
        events.push(...eventsInformation);
    }

    return events;
}

export async function lectio(): Promise<any> {
    const lectioInformation = await getLectioInformation();
    if (lectioInformation === undefined) return;

    const lectioTeams = await getLectioTeams(lectioInformation);
    if (lectioTeams === undefined) return;

    const calendar = [];
    const dates = getDates();
    const calendarDates = getGoogleDates([ dates[0], dates[2] ]);

    for (const date of dates) {
        const weekCalendar = await getLectioEvents(lectioInformation, lectioTeams, date);
        calendar.push(...weekCalendar);
    }

    return [ calendar, calendarDates ];
}