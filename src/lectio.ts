import { LectioAuthentication, LectioCredentials} from "./types";
import { scrape } from "twchtmlscraper";

async function _generateLectioCredentials(schoolId: number, username: string, password: string): Promise<LectioCredentials> {
    const lectio = await scrape(`https://www.lectio.dk/lectio/${schoolId}/login.aspx`);
    const sessionId = lectio.cookies["ASP.NET_SessionId"].value;

    const inputs = lectio.findAll("input");
    const dataInputs = inputs
        .filter(input => input.attributes.type === "hidden")
        .filter(input => input.attributes.name !== "query")
        .filter(input => input.attributes.value !== 0);

    const data = new URLSearchParams();
    dataInputs.forEach(input => data.append(input.attributes.name as string, input.attributes.value as string));

    data.append("__EVENTTARGET", "m$Content$submitbtn2");
    data.append("__EVENTARGUMENT", "")
    data.append("m$Content$username", username);
    data.append("m$Content$password", password);
    data.append("m$Content$AutologinCbx", "on");
    data.append("LectioPostbackId", "");

    return { sessionId, data };
}

export class Lectio {
    private authentication: LectioAuthentication

    public static async Authenticate(schoolId: number, username: string, password: string): Promise<LectioAuthentication> {
        const credentials = await _generateLectioCredentials(schoolId, username, password);
        const sessionId = credentials.sessionId;

        const document = await scrape(`https://www.lectio.dk/lectio/${schoolId}/login.aspx`, {
            method: "POST",
            redirect: "manual",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            cookies: { "ASP.NET_SessionId": sessionId },
            body: credentials.data
        });

        const cookie = document.cookies["autologinkey"];
        const token = cookie.value;
        const expires = cookie.expires ?? 0;

        return { schoolId, sessionId, token, expires };
    }

    constructor(data: LectioAuthentication) {
        this.authentication = data;
    }

    public async getLessons(weeks: Number) {
        const html = await scrape("https://www.lectio.dk/lectio/477/SkemaNy.aspx", {
            cookies: {
                "ASP.NET_SessionId": this.authentication.sessionId,
                "autologinkey": this.authentication.token
            },
        });

        console.log(html);
    }
}
/*

export async function getLessons(weeks: Number) {
    const html = await lectioScrape("SkemaNy.aspx");
    const lessonsHtml = html.findAll(".s2skemabrik");
    const gradeHtml = html.find(".ls-identity-container > span");

    // let grade = "";
    // if (gradeHtml?.content)
    //     grade = gradeHtml.content.split(", ")[1].replace("-", "").trim();
    //
    // const lessons: Array<Lesson> = [];
    // lessonsHtml.forEach(function(lessonHtml) {
    //     if ((lessonHtml.data.tooltip as string).includes("Hele dagen") && !(lessonHtml.data.tooltip as string).includes(grade)) return;
    //
    //     console.log(lessonHtml);
    //     const lesson: Lesson = {
    //         cancelled: false
    //     } as any;
    //
    //
    //
    //     if (lessonHtml.class.includes("s2cancelled")) lesson.cancelled = true;
    //
    //     console.log(lesson);
    //     lessons.push(lesson);
    // });
}*/
