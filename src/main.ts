import * as dotenv from "dotenv";
import { Lectio } from "./lectio";
dotenv.config();

async function main() {
    const schoolId = parseInt(process.env.LECTIO_SCHOOL_ID ?? "0") as number;
    const username = atob(process.env.LECTIO_USERNAME as string);
    const password = atob(process.env.LECTIO_PASSWORD as string);

    const auth = await Lectio.Authenticate(schoolId, username, password);
    const lectio = new Lectio(auth);

    lectio.getLessons(3);
    // const lessons = getLessons(3);
}

main();