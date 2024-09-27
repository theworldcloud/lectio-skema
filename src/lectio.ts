import { scrape } from "twchtmlscraper";

async function generateCredentials() {
    const schoolId = process.env.LECTIO_SCHOOL_ID;
    const lectio = await scrape(`https://www.lectio.dk/lectio/${schoolId}/login.aspx`);
    const sessionId = lectio.cookies["ASP.NET_SessionId"];
    const eventValidation = lectio.find("#__EVENTVALIDATION")?.attributes.value;

    const username = atob(process.env.LECTIO_USERNAME as string);
    const password = atob(process.env.LECTIO_PASSWORD as string);
    const formdata = new FormData();
    formdata.append("m$Content$username", username);
    formdata.append("m$Content$password", password);
    formdata.append("m$Content$passwordHidden", password);
    formdata.append("__EVENTVALIDATION", eventValidation);
    formdata.append("__EVENTTARGET", "m$Content$submitbtn2");
    formdata.append("__EVENTARGUMENT", "");
    formdata.append("masterfootervalue", "X1!ÆØÅ");
    formdata.append("LectioPostbackId", "");

    return {
        sessionId: sessionId,
        data: formdata,
    };
}

