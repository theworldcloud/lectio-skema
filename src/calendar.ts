import { google } from "googleapis";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport";

export async function googleAuthentication() {
    const authClient = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    authClient.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    return authClient;
}

export async function calendar(dates: Array<string>) {
    const GOOGLE_CALENDAR = process.env.GOOGLE_CALENDAR;
    const authClient = await googleAuthentication();
    const googleCalendar = google.calendar({ version: "v3", auth: authClient });

    const googleEventData = await googleCalendar.events.list({ calendarId: GOOGLE_CALENDAR, timeMin: dates[0], timeMax: dates[1] });
    const googleEvents = googleEventData.data.items;

    console.log(googleEvents);
}