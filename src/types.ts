export const CLASS = "1q";
export const TEAM = "1h";

export const IGNORED_EVENTS = [ 
    "g-hold", "1.g", "2.g", "3.g", 
    "mus-lejr", "studiecafé", "folkemøde",
    "ledelse", "verdens", "bibliotek", 
    "tromme"
]

export interface LectioInformation {
    eventValidation: string;
    sessionIdentifier: string;
}

export type LectioTeams = Record<string, string>;

export type LectioCalendar = {
    label: string;
    date: string;
    time: {
        start: string;
        end: string;
    } | "all-day";

    available: boolean;
    cancelled: boolean;

    teachers: Array<string>;
    locations: Array<string>;
    notes: string | undefined;
    homework: string | undefined;
}