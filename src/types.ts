export const CLASS = "1q";
export const TEAM = "1h";

export const EVENT_TIMES: Record<string, LectioTime> = {
    "1": { start: "08:05", end: "09:40" },
    "2": { start: "10:00", end: "11:35" },
    "3": { start: "12.10", end: "13:45" },
    "4": { start: "13:55", end: "15:30" },
    "5": { start: "15:40", end: "17:15" }
}

export const IGNORED_EVENTS = [ 
    "g-hold", "1.g", "2.g", "3.g", 
    "mus-lejr", "studiecafé", "folkemøde",
    "ledelse", "verdens", "bibliotek", 
    "tromme", "2.hf", "udveksling", "filmaften",
    "flex", "1g", "2g", "3g", "masterclass", 
    "frisport", "mindfulness"
]

export interface LectioInformation {
    eventValidation: string;
    sessionIdentifier: string;
}

export interface LectioCookies {
    sessionIdentifier: string;
    lectiogsc: string;
}

export type LectioTeams = Record<string, string>;
export type LectioTime = { start: string; end: string; };

export type LectioEvent = {
    label: string;
    date: LectioTime | string;
    time: LectioTime | "all-day";

    available: boolean;
    cancelled: boolean;

    teachers: Array<string>;
    locations: Array<string>;
    notes: string | undefined;
    homework: string | undefined;
}

export type GoogleEvent = {
    id: string;
    label: string;
    date?: LectioTime | string;
    time?: LectioTime | "all-day";
}

export interface ReplacedEvents {
    deleted: GoogleEvent;
    inserted: GoogleEvent;
}