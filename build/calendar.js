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
exports.calendar = exports.googleAuthentication = void 0;
const googleapis_1 = require("googleapis");
function googleAuthentication() {
    return __awaiter(this, void 0, void 0, function* () {
        const authClient = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        authClient.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        return authClient;
    });
}
exports.googleAuthentication = googleAuthentication;
function calendar(dates) {
    return __awaiter(this, void 0, void 0, function* () {
        const GOOGLE_CALENDAR = process.env.GOOGLE_CALENDAR;
        const authClient = yield googleAuthentication();
        const googleCalendar = googleapis_1.google.calendar({ version: "v3", auth: authClient });
        const googleEventData = yield googleCalendar.events.list({ calendarId: GOOGLE_CALENDAR, timeMin: dates[0], timeMax: dates[1] });
        const googleEvents = googleEventData.data.items;
        console.log(googleEvents);
    });
}
exports.calendar = calendar;
