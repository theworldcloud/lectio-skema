import * as dotenv from "dotenv";
import {getLessons} from "./lectio";
dotenv.config();

async function main() {
    const lessons = getLessons(3);
}

main();