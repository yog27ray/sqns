import { BaseObjectType } from '../../../../typings/class-types';
declare class BaseObject {
    id: string;
    createdAt?: Date;
    updatedAt?: Date;
    constructor(item: BaseObjectType);
    toJSON(): {
        [key: string]: any;
    };
}
export { BaseObject };
