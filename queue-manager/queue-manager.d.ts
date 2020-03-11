declare class QueueManager {
    isMaster: boolean;
    constructor({ isMaster, masterURL }: {
        isMaster: boolean;
        masterURL: string;
        requestTasks?: Array<string>;
    });
    generateRoutes(): any;
}
export { QueueManager };
//# sourceMappingURL=queue-manager.d.ts.map