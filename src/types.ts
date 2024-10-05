export type LectioCredentials = { sessionId: string, data: URLSearchParams };

export interface LectioAuthentication {
    schoolId: number;
    sessionId: string;

    token: string;
    expires: number;
}

export interface Lesson {
    label: string;

    teachers: Array<string>;
    location: string;

    note: string;
    homework: string;

    exam: boolean;
    cancelled: boolean;

}