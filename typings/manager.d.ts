export interface SQSPriorities {
    PRIORITY_TOTAL: number;
    [key: string]: number | SQSPriorities;
}
