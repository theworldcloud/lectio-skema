import { google } from "googleapis";
import { spawn } from "child_process";
import express, { Express, Request, Response } from "express";
import { debug } from "./main";

const SCOPES = [ "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events" ];
export const BROWSER = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const application = express();

async function getCode(uri: string): Promise<string | undefined> {
    let code: string | undefined = undefined;
    await application.listen(3000, () => debug("Authenticating google..."));

    application.get("/", function(req: Request, res: Response) {
        if (req.query.code === undefined) {
            res.send(":(");
            code = "error";
        } else {
            res.send(":)");
            code = req.query.code as string;
        }
    });

    spawn(BROWSER, [ "-new-tab", uri ])

    while (code === undefined) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return code;
}

export async function googleAuthentication(): Promise<Record<string, any> | undefined> {
    const authClient = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    const uri = authClient.generateAuthUrl({ access_type: "offline", redirect_uri: "http://localhost:3000", scope: SCOPES.join(" ") });
    const code = await getCode(uri);
    if (code === "error") return undefined;
    
    const dataJSON = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: "http://localhost:3000"
        })
    })

    const data: any = await dataJSON.json();
    authClient.setCredentials({ access_token: data.access_token, refresh_token: data.refresh_token });

    return authClient;
}