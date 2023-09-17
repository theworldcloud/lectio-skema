import * as dotenv from "dotenv";

import { lectio } from "./lectio";
import { calendar } from "./calendar";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

dotenv.config();

async function main() {
    const data = new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
    const [ date, time ] = data.split(" ");
    const now = `${date.replace(".", "/").replace(".", "/")} - ${time.replace(".", ":").slice(0, 5)}`;

    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log(`[ ${now} ] Updating calendar...`);

    const [ lectioCalendar, dates ] = await lectio();
    const [ iEvents, dEvents, aEvents ] = await calendar(dates, lectioCalendar);

    console.log(" ");
    console.log(`[ ${now} ]`);
    console.log(`- Inserted ${iEvents} events`);
    console.log(`- Deleted ${dEvents} events`);
    console.log(`- Updated calendar | ${aEvents} events affected!`);
    console.log(" ");
    console.log(" ");
}

main();
