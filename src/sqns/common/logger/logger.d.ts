import { Logger4Node } from 'logger4node';
import { SQNSLoggingConfig } from '../../../../typings/config';
declare const logger: Logger4Node;
declare function updateLogging(logging?: SQNSLoggingConfig): void;
export { logger, updateLogging };
