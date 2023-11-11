export const CLASS = "1q";
export const TEAM = "1h";

export const IGNORED_EVENTS = [ 
    "g-hold", "1.g", "2.g", "3.g", 
    "mus-lejr", "studiecafé", "folkemøde",
    "ledelse", "verdens", "bibliotek", 
    "tromme", "2.hf", "udveksling", "filmaften",
    "flex", "1g", "2g", "3g", "masterclass"
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