"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lectio = void 0;
const types_1 = require("./types");
function getLectioInformation() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const site = yield fetch(`https://www.lectio.dk/lectio/${process.env.LECTIO}/login.aspx`);
        const html = yield site.text();
        const validationElement = html.split("\n").find((line) => line.includes("__EVENTVALIDATION"));
        if (validationElement === undefined)
            return undefined;
        const validationAttributes = validationElement.split(" ");
        const eventValidation = validationAttributes[validationAttributes.length - 2].replace("value=\"", "").replace("\"", "");
        const cookies = (_b = (_a = site.headers.get("set-cookie")) === null || _a === void 0 ? void 0 : _a.split(";")) !== null && _b !== void 0 ? _b : [];
        const cookie = (_d = (_c = cookies.find((c) => c.includes("ASP.NET_SessionId"))) === null || _c === void 0 ? void 0 : _c.split("ASP.NET_SessionId=")[1]) !== null && _d !== void 0 ? _d : "";
        return {
            eventValidation: eventValidation,
            sessionIdentifier: cookie
        };
    });
}
function generateLectioCredentials(eventValidation) {
    var _a, _b;
    const formdata = new FormData();
    const username = atob((_a = process.env.LECTIO_USERNAME) !== null && _a !== void 0 ? _a : "");
    const password = atob((_b = process.env.LECTIO_PASSWORD) !== null && _b !== void 0 ? _b : "");
    formdata.append("m$Content$username", username !== null && username !== void 0 ? username : "");
    formdata.append("m$Content$password", password !== null && password !== void 0 ? password : "");
    formdata.append("m$Content$passwordHidden", password !== null && password !== void 0 ? password : "");
    formdata.append("__EVENTVALIDATION", eventValidation);
    formdata.append("__EVENTTARGET", "m$Content$submitbtn2");
    formdata.append("__EVENTARGUMENT", "");
    formdata.append("masterfootervalue", "X1!ÆØÅ");
    formdata.append("LectioPostbackId", "");
    return formdata;
}
function lectioFetch(url, lectioInformation) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`https://www.lectio.dk/lectio/${process.env.LECTIO}/${url}`, {
            method: "POST",
            headers: { "Cookie": `ASP.NET_SessionId=${lectioInformation.sessionIdentifier}` },
            body: generateLectioCredentials(lectioInformation.eventValidation),
            redirect: "follow"
        });
        return yield res.text();
    });
}
function getLectioTeams(lectioInformation) {
    return __awaiter(this, void 0, void 0, function* () {
        const lectioTeams = {};
        const site = yield lectioFetch("login.aspx?prevurl=FindSkema.aspx?type=hold", lectioInformation);
        const elements = site.split("\n");
        const teamElements = elements.filter((element) => element.includes("class='findskema-symbol'"));
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
    });
}
function getEndOfInformation(calender, position, special) {
    const calendarInputs = calender.slice(position + 1, calender.length);
    for (const input in calendarInputs) {
        if (special === true && calendarInputs[input].length === 0)
            return parseInt(input) + position + 2;
        if (calendarInputs[input].includes('">\r')) {
            return parseInt(input) + position + 2;
        }
    }
    return 0;
}
function isDate(date) {
    if (date.includes("/") === false)
        return false;
    if (date.includes("-") === false)
        return false;
    if (date.includes(":") === false)
        return false;
    if (date.includes("til") === false)
        return false;
    return true;
}
function isState(state) {
    if (state.includes("Ændret!") === true)
        return true;
    if (state.includes("Aflyst!") === true)
        return true;
    return false;
}
function isLabel(label) {
    if (isDate(label) === true)
        return false;
    if (isState(label) === true)
        return false;
    return true;
}
function isAvailable(label) {
    if (label.includes(types_1.CLASS) === true)
        return false;
    if (label.includes(types_1.TEAM) === true)
        return false;
    if (label.includes("Morgensamling") === true)
        return false;
    if (label.includes("Studievejledning") === true)
        return false;
    return true;
}
function getSpecialInformation(information) {
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
function getLectioCalendarInformation(calender, position, teams) {
    if (calender[position].includes("span"))
        return undefined;
    if (calender[position].includes("s2skemabrikInnerContainer"))
        return undefined;
    if (calender[position].includes("withMediaQuery"))
        return undefined;
    const startOfInformation = position;
    const endOfInformation = getEndOfInformation(calender, position, false);
    const informationInputs = calender.slice(startOfInformation, endOfInformation);
    if (informationInputs[1].includes("Hele dagen")) {
        const label = informationInputs[0].split('data-additionalInfo="')[1];
        const date = informationInputs[1].split(" ")[0];
        for (const event of types_1.IGNORED_EVENTS) {
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
    if (test === undefined)
        return undefined;
    if (test === "Studiecafé" || test === "FLEX-modul")
        return undefined;
    const calendarInformation = {};
    calendarInformation.cancelled = false;
    calendarInformation.notes = undefined;
    calendarInformation.homework = undefined;
    if (isDate(test)) {
        calendarInformation.date = test.split(" ")[0];
        calendarInformation.time = { start: test.split(" ")[1], end: test.split(" ")[3] };
    }
    else {
        for (const input in informationInputs) {
            if (isDate(informationInputs[input]) === true) {
                calendarInformation.date = informationInputs[input].split(" ")[0];
                calendarInformation.time = {
                    start: informationInputs[input].split(" ")[1],
                    end: informationInputs[input].split(" ")[3]
                };
                break;
            }
        }
    }
    if (isState(test)) {
        if (test.includes("Aflyst!"))
            calendarInformation.cancelled = true;
        if (test.includes("Ændret!"))
            calendarInformation.cancelled = false;
    }
    if (isLabel(test)) {
        calendarInformation.label = test;
    }
    if (calendarInformation.label === undefined && isLabel(informationInputs[1]) === true)
        calendarInformation.label = informationInputs[1];
    for (const input in informationInputs) {
        const infInput = informationInputs[input];
        if (infInput.includes("Hold:") === true && infInput.includes("Alle") === false) {
            let data = infInput.split("Hold: ")[1].split(" ");
            data[1] = data[1].replace(",", "");
            if (data[1].includes("stm") === true || data[1].includes("vrk") === true) {
                data = [data[0], data[1]];
            }
            let label = teams[data[1].toUpperCase()];
            const teamData = data[1].split("-");
            if (teamData.length === 2)
                label = teams[teamData[1].toUpperCase()];
            if (data.length > 2) {
                if (calendarInformation.label === undefined)
                    return undefined;
                calendarInformation.label = calendarInformation.label;
            }
            else {
                calendarInformation.label = `${data[0]} ${data[1].toLowerCase()} (${label})`;
            }
        }
        if (infInput.includes("Lærer:")) {
            const teacherElements = infInput.split("Lærer: ")[1].split(" ");
            let teacher = teacherElements[teacherElements.length - 1];
            teacher = teacher.replace("(", "");
            teacher = teacher.replace(")", "");
            teacher = teacher.replace('">\r', "");
            calendarInformation.teachers = [teacher];
        }
        if (infInput.includes("Lærere:")) {
            const teachers = infInput.split("Lærere: ")[1].split(", ");
            calendarInformation.teachers = teachers;
        }
        if (infInput.includes("Lokale:")) {
            const location = infInput.split("Lokale: ")[1].replace('">\r', "");
            calendarInformation.locations = [location];
        }
        if (infInput.includes("Lokaler:")) {
            const locations = infInput.split("Lokaler: ")[1].replace('">\r', "").split(", ");
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
    if (calendarInformation.teachers === undefined)
        calendarInformation.teachers = [];
    if (calendarInformation.locations === undefined)
        calendarInformation.locations = [];
    calendarInformation.available = isAvailable(calendarInformation.label);
    return calendarInformation;
}
function getLectioCalendar(lectioInformation, lectioTeams) {
    return __awaiter(this, void 0, void 0, function* () {
        const site = yield lectioFetch("login.aspx?prevurl=SkemaNy.aspx", lectioInformation);
        const htmlElements = site.split("\n");
        const startCalendar = htmlElements.findIndex((element) => element.includes('id="s_m_Content_Content_SkemaNyMedNavigation_skemaprintarea"'));
        const endCalendar = htmlElements.findIndex((element) => element.includes('</table>'));
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
        console.log(lectioCalendar);
    });
}
function lectio() {
    return __awaiter(this, void 0, void 0, function* () {
        const lectioInformation = yield getLectioInformation();
        if (lectioInformation === undefined)
            return;
        const lectioTeams = yield getLectioTeams(lectioInformation);
        if (lectioTeams === undefined)
            return;
        getLectioCalendar(lectioInformation, lectioTeams);
    });
}
exports.lectio = lectio;
