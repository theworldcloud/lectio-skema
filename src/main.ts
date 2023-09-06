import express, { Express, Request, Response } from 'express';
import * as dotenv from "dotenv";

import { lectio } from "./lectio";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

let executed:number = 0;
export const executeupdate = () => executed++;

dotenv.config();
export const application: Express = express();
application.use(express.static("public"));
application.use(express.json());
application.use(express.urlencoded({ extended: true }));

application.listen(3000, () => console.info("Started application!"));
application.get("/", (req: Request, res: Response) => res.send("executed:   " + executed));

// lectio();
// executeupdate();
// setInterval(executeupdate, 30 * MINUTES);

async function main() {
    const lectioCalendar = await lectio();
    console.log(lectioCalendar);
}

main();