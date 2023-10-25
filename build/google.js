"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthentication = void 0;
const googleapis_1 = require("googleapis");
const child_process_1 = require("child_process");
const express_1 = __importDefault(require("express"));
const main_1 = require("./main");
const SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"];
const BROWSER = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const application = (0, express_1.default)();
function getCode(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        let code = undefined;
        yield application.listen(3000, () => (0, main_1.debug)("Authenticating google..."));
        application.get("/", (req, res) => {
            if (req.query.code === undefined) {
                res.send(":(");
                code = "error";
            }
            else {
                res.send(":)");
                code = req.query.code;
            }
        });
        (0, child_process_1.spawn)(BROWSER, ["-new-tab", uri]);
        while (code === undefined) {
            yield new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return code;
    });
}
function googleAuthentication() {
    return __awaiter(this, void 0, void 0, function* () {
        const authClient = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        const uri = authClient.generateAuthUrl({ access_type: "offline", redirect_uri: "http://localhost:3000", scope: SCOPES.join(" ") });
        const code = yield getCode(uri);
        if (code === "error")
            return undefined;
        const dataJSON = yield fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: JSON.stringify({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: "http://localhost:3000"
            })
        });
        const data = yield dataJSON.json();
        authClient.setCredentials({ access_token: data.access_token, refresh_token: data.refresh_token });
        return authClient;
    });
}
exports.googleAuthentication = googleAuthentication;
