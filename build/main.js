"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.application = void 0;
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const lectio_1 = require("./lectio");
const calendar_1 = require("./calendar");
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
dotenv.config();
exports.application = (0, express_1.default)();
exports.application.use(express_1.default.static("public"));
exports.application.use(express_1.default.json());
exports.application.use(express_1.default.urlencoded({ extended: true }));
exports.application.listen(3000, () => console.info("Started application!"));
exports.application.get("/", (request, response) => { return response.send(":)"); });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
        const [date, time] = data.split(" ");
        const now = `${date.replace(".", "/").replace(".", "/")} - ${time.replace(".", ":").slice(0, 5)}`;
        console.log(" ");
        console.log(" ");
        console.log(" ");
        console.log(`[ ${now} ] Updating calendar...`);
        const [lectioCalendar, dates] = yield (0, lectio_1.lectio)();
        const [iEvents, dEvents, aEvents] = yield (0, calendar_1.calendar)(dates, lectioCalendar);
        console.log(" ");
        console.log(`[ ${now} ]`);
        console.log(`- Inserted ${iEvents} events`);
        console.log(`- Deleted ${dEvents} events`);
        console.log(`- Updated calendar | ${aEvents} events affected!`);
        console.log(" ");
        console.log(" ");
    });
}
// main();
// setInterval(main, 7 * HOURS);
