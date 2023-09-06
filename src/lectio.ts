import { LectioInformation, LectioTeams, LectioCalendar, IGNORED_EVENTS, TEAM, CLASS } from "./types";

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

    return lectioTeams;
}

function getEndOfInformation(calender: Array<string>, position: number, special: boolean): number {
    const calendarInputs = calender.slice(position + 1, calender.length);

    for (const input in calendarInputs) {
        if (special === true && calendarInputs[input].length === 0) return parseInt(input) + position + 2;

        if (calendarInputs[input].includes('">\r')) {
            return parseInt(input) + position + 2;
        }
    }

    return 0;
}

function isDate(date: string): boolean {
    if (date.includes("/") === false) return false;
    if (date.includes("-") === false) return false;
    if (date.includes(":") === false) return false;
    if (date.includes("til") === false) return false;

    return true;
}

function isState(state: string): boolean {
    if (state.includes("Ændret!") === true) return true;
    if (state.includes("Aflyst!") === true) return true;

    return false;
}

function isLabel(label: string): boolean {
    if (isDate(label) === true) return false;
    if (isState(label) === true) return false;
    if (label.includes("Lærer") === true) return false;
    if (label.includes("Lokale") === true) return false;
    if (label.includes("Hold:") === true) return false;
    if (label.includes("Note") === true) return false;
    if (label.includes("Lektier" ) === true) return false;

    return true;
}

function isAvailable(label: string): boolean {
    label = label.toLowerCase();

    if (label.includes(CLASS) === true) return false;
    if (label.includes(TEAM) === true) return false;
    if (label.includes("morgensamling") === true) return false;
    if (label.includes("studievejledning") === true) return false;
    if (label.includes("ekskursion") === true) return false;

    return true;
}

function getSpecialInformation(information: Array<string>): string | undefined {
    const endOfInformation = getEndOfInformation(information, 0, true);

    for (const index in information) {
        if (parseInt(index) <= endOfInformation) {
            information[index] = information[index].replace('\r', "");
            information[index] = information[index].replace('">', "");
        }
    }

    if (information.length - 1 > endOfInformation) {
        for (let index = endOfInformation; index < information.length; index++) {
            delete information[index];
        }   
    }

    return information.join(" ");
}

function getLectioCalendarInformation(calender: Array<string>, position: number, teams:LectioTeams): LectioCalendar | undefined {
    if (calender[position].includes("span")) return undefined;
    if (calender[position].includes("s2skemabrikInnerContainer")) return undefined;
    if (calender[position].includes("withMediaQuery")) return undefined;

    const startOfInformation = position;
    const endOfInformation = getEndOfInformation(calender, position, false);
    const informationInputs = calender.slice(startOfInformation, endOfInformation);
    if (informationInputs.length === 0) return undefined;

    if (informationInputs[1].includes("Hele dagen")) {
        const label = informationInputs[0].split('data-additionalInfo="')[1];
        const date = informationInputs[1].split(" ")[0];
        
        for (const event of IGNORED_EVENTS) {
            if ((label.toLowerCase()).includes(event) === true) 
                return undefined;
        }

        return {
            label: label,
            date: date,
            time: "all-day",

            available: true,
            cancelled: false,

            teachers: [],
            locations: [],
            notes: undefined,
            homework: undefined
        }; 
    }

    const test = informationInputs[0].split('data-additionalInfo="')[1];
    if (test === undefined) return undefined;
    if (test === "Studiecafé" || test === "FLEX-modul") return undefined;

    const calendarInformation:LectioCalendar = {} as any;
    calendarInformation.cancelled = false;
    calendarInformation.notes = undefined;
    calendarInformation.homework = undefined;

    if (isDate(test)) {
        const times = test.split(" ");

        if (times.length === 5) {
            calendarInformation.date = { start: times[0], end: times[3] };
            calendarInformation.time = { start: times[1], end: times[4] };
        } else {
            calendarInformation.date = times[0];
            calendarInformation.time = { start: times[1], end: times[3] };
        }
    } else {
        for (const input in informationInputs) {
            if (isDate(informationInputs[input]) === true) {
                const times = informationInputs[input].split(" ");

                if (times.length === 5) {
                    calendarInformation.date = { start: times[0], end: times[3] };
                    calendarInformation.time = { start: times[1], end: times[4] };
                } else {
                    calendarInformation.date = times[0];
                    calendarInformation.time = { start: times[1], end: times[3] };
                }

                break;
            }
        }
    }

    if (isState(test)) {
        if (test.includes("Aflyst!")) calendarInformation.cancelled = true;
        if (test.includes("Ændret!")) calendarInformation.cancelled = false;
    }

    if (isLabel(test)) {
        calendarInformation.label = test;
    }

    if (calendarInformation.label === undefined && isLabel(informationInputs[1]) === true) 
        calendarInformation.label = informationInputs[1];

    for (const input in informationInputs) {
        const infInput = informationInputs[input];

        if (calendarInformation.label !== undefined && infInput.includes("Hold:") === true && infInput.includes("Alle") === false) {
            let data = infInput.split("Hold: ")[1].split(" ");

            data[1] = data[1].replace(",", "");
            if (data[1].includes("stm") === true || data[1].includes("vrk") === true) {
                data = [ data[0], data[1] ];
            }
            
            let label = teams[data[1].toUpperCase()];
            const teamData = data[1].split("-");
            if (teamData.length === 2) label = teams[teamData[1].toUpperCase()];

            if (data.length > 2) {
                if (calendarInformation.label === undefined) return undefined;
                calendarInformation.label = calendarInformation.label;
            } else {
                calendarInformation.label = `${data[0]} ${data[1].toLowerCase()} (${label}) | ${calendarInformation.label}`;
            }
        }

        if (calendarInformation.label === undefined && infInput.includes("Hold:") === true && infInput.includes("Alle") === false) {
            let data = infInput.split("Hold: ")[1].split(" ");

            data[1] = data[1].replace(",", "");
            if (data[1].includes("stm") === true || data[1].includes("vrk") === true) {
                data = [ data[0], data[1] ];
            }
            
            let label = teams[data[1].toUpperCase()];
            const teamData = data[1].split("-");
            if (teamData.length === 2) label = teams[teamData[1].toUpperCase()];

            if (data.length > 2) {
                if (calendarInformation.label === undefined) return undefined;
                calendarInformation.label = calendarInformation.label;
            } else {
                calendarInformation.label = `${data[0]} ${data[1].toLowerCase()} (${label})`;
            }
        }

        if (infInput.includes("Lærer:")) {
            const teacherElements = infInput.split("Lærer: ")[1].split(" ");
            let teacher = teacherElements[teacherElements.length - 1];

            teacher = teacher.replace("(", "");
            teacher = teacher.replace(")", "");
            teacher = teacher.replace('">\r', "");
            
            calendarInformation.teachers = [ teacher ];
        }

        if (infInput.includes("Lærere:")) {
            const teachers = infInput.split("Lærere: ")[1].split(", ");
            teachers[teachers.length - 1] = teachers[teachers.length - 1].replace('">\r', "");
            calendarInformation.teachers = teachers;
        }

        if (infInput.includes("Lokale:")) {
            const location = infInput.split("Lokale: ")[1].replace('">\r', "");
            calendarInformation.locations = [ location ];
        }

        if (infInput.includes("Lokaler:")) {
            const locations = infInput.split("Lokaler: ")[1].replace('">\r', "").split(", ");
            locations[locations.length - 1] = locations[locations.length - 1].replace('">\r', "");
            calendarInformation.locations = locations;
        }

        if (infInput.includes("Note:")) {
            const notes = getSpecialInformation(informationInputs.slice(parseInt(input) + 1, informationInputs.length));
            calendarInformation.notes = notes;
        }

        if (infInput.includes("Lektier:")) {
            const homework = getSpecialInformation(informationInputs.slice(parseInt(input) + 1, informationInputs.length));
            calendarInformation.homework = homework;
        }
    }

    if (calendarInformation.label !== undefined && isLabel(informationInputs[1]) === true) {
        const extraLabel = informationInputs[1];

        if (extraLabel.includes("Hold:") === false && calendarInformation.label !== extraLabel) {
            calendarInformation.label = calendarInformation.label + " | " + extraLabel;
        } 
    } 

    if (calendarInformation.teachers === undefined) calendarInformation.teachers = [];
    if (calendarInformation.locations === undefined) calendarInformation.locations = [];
    calendarInformation.available = isAvailable(calendarInformation.label);
    
    return calendarInformation;
}

async function getLectioCalendar(lectioInformation: LectioInformation, lectioTeams: LectioTeams, date: string) {
    const site = await lectioFetch(`login.aspx?prevurl=SkemaNy.aspx?week=${date}`, lectioInformation);
    const htmlElements = site.split("\n");

    const startCalendar = htmlElements.findIndex((element: string) => element.includes('id="s_m_Content_Content_SkemaNyMedNavigation_skemaprintarea"'));
    const endCalendar = htmlElements.findIndex((element: string) => element.includes('</table>'));
    const calendarElements = htmlElements.slice(startCalendar, endCalendar);

    const lectioCalendar = [];

    for (const calendarIndex in calendarElements) {
        if (calendarElements[calendarIndex].includes("s2skemabrik")) {
            const lectioCalendarInformation = getLectioCalendarInformation(calendarElements, parseInt(calendarIndex), lectioTeams);
            
            if (lectioCalendarInformation !== undefined) {
                lectioCalendar.push(lectioCalendarInformation);
            }
        }
    }

    return lectioCalendar;
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

export async function lectio() {
    const lectioInformation = await getLectioInformation();
    if (lectioInformation === undefined) return;

    const lectioTeams = await getLectioTeams(lectioInformation);
    if (lectioTeams === undefined) return;

    const calendar = [];
    const dates = getDates();

    for (const date of dates) {
        const weekCalendar = await getLectioCalendar(lectioInformation, lectioTeams, date);
        calendar.push(...weekCalendar)
    }

    return calendar;
}