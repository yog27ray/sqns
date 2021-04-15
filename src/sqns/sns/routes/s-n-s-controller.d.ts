import { ExpressMiddleware } from '../../../../typings/express';
import { SNSManager } from '../manager/s-n-s-manager';
declare class SNSController {
    private serverURL;
    private snsManager;
    constructor(serverURL: string, snsManager: SNSManager);
    snsGet(): ExpressMiddleware;
    sns(): ExpressMiddleware;
    private confirmSubscription;
    private removeSubscription;
    private updateDeliveryPolicyAndDisplayName;
}
export { SNSController };
