import express, { Express, Request, Response } from 'express';
import * as dotenv from "dotenv";

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

setInterval(() => executed++, 5 * SECONDS);