export interface Lesson {
    label: string;

    teachers: Array<string>;
    location: string;

    note: string;
    homework: string;

    exam: boolean;
    cancelled: boolean;

}