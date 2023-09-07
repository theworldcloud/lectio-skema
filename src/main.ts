import express, { Express, Request, Response } from 'express';
import * as dotenv from "dotenv";

import { lectio } from "./lectio";
import { calendar } from "./calendar";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

dotenv.config();

async function main() {
    const [ lectioCalendar, dates ] = await lectio();
    // console.log(lectioCalendar);

    calendar(dates);
}

main();




// let executed:number = 0;
// export const executeupdate = () => executed++;

// export const application: Express = express();
// application.use(express.static("public"));
// application.use(express.json());
// application.use(express.urlencoded({ extended: true }));

// application.listen(3000, () => console.info("Started application!"));
// application.get("/", (req: Request, res: Response) => res.send("executed:   " + executed));

// lectio();
// executeupdate();
// setInterval(executeupdate, 30 * MINUTES);