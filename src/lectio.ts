import { scrape } from "twchtmlscraper";
import {Lesson} from "../backup/types";

async function generateCredentials() {
    const schoolId = process.env.LECTIO_SCHOOL_ID;
    const lectio = await scrape(`https://www.lectio.dk/lectio/${schoolId}/login.aspx`);
    const sessionId = lectio.cookies["ASP.NET_SessionId"];

    const inputs = lectio.findAll("input");
    const dataInputs = inputs
        .filter(input => input.attributes.type === "hidden")
        .filter(input => input.attributes.name !== "query")
        .filter(input => input.attributes.value !== 0);

    const data = new URLSearchParams();
    dataInputs.forEach(input => data.append(input.attributes.name as string, input.attributes.value as string));

    const username = atob(process.env.LECTIO_USERNAME as string);
    const password = atob(process.env.LECTIO_PASSWORD as string);

    data.append("__EVENTTARGET", "m$Content$submitbtn2");
    data.append("__EVENTARGUMENT", "")
    data.append("m$Content$username", username);
    data.append("m$Content$password", password);
    data.append("LectioPostbackId", "");

    return { sessionId, data };
}

async function lectioScrape(url: string) {
    const credentials = await generateCredentials();
    const html = await scrape(`https://www.lectio.dk/lectio/477/login.aspx?prevurl=${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        cookies: { "ASP.NET_SessionId": credentials.sessionId },
        body: credentials.data
    });

    return html;
}

export async function getLessons(weeks: Number) {
    const html = await lectioScrape("SkemaNy.aspx");
    const lessonsHtml = html.findAll(".s2skemabrik");
    const gradeHtml = html.find(".ls-identity-container > span");

    let grade = "";
    if (gradeHtml?.content)
        grade = gradeHtml.content.split(", ")[1].replace("-", "").trim();

    const lessons: Array<Lesson> = [];
    lessonsHtml.forEach(function(lessonHtml) {
        if ((lessonHtml.data.tooltip as string).includes("Hele dagen") && !(lessonHtml.data.tooltip as string).includes(grade)) return;

        console.log(lessonHtml);
        const lesson: Lesson = {
            cancelled: false
        } as any;



        if (lessonHtml.class.includes("s2cancelled")) lesson.cancelled = true;

        console.log(lesson);
        lessons.push(lesson);
    });
}