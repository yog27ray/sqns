declare class MSQueue {
    isMaster: boolean;
    constructor({ isMaster }: {
        isMaster: boolean;
        requestTasks?: Array<string>;
    });
    generateRoutes(): any;
}
export { MSQueue };
