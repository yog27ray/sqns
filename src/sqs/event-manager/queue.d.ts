declare interface QueueType {
    id: string;
    name: string;
    attributes: any;
    tags: any;
    createdAt?: Date;
    updatedAt?: Date;
}
declare class Queue {
    id: string;
    name: string;
    attributes: any;
    tags: any;
    createdAt: Date;
    updatedAt: Date;
    constructor(item: QueueType);
    toJSON(): {
        [key: string]: any;
    };
    clone(): Queue;
    getExponentialFactor(): number;
    calculateNewEventTime(time: Date, exponentialPower: number, delayInSeconds: number): Date;
    getMaxReceiveCount(): number;
}
export { Queue };
