import { Logger4Node } from 'logger4node';
import { SQNSLoggingConfig } from '../../../client';

const logger = new Logger4Node('sqns');

function updateLogging(logging?: SQNSLoggingConfig): void {
  if (!logging) {
    return;
  }
  if (logging.json) {
    logger.setJsonLogging(logging.json);
    return;
  }
  logger.setJsonLogging(false);
  if (logging.stringOnly) {
    logger.setStringLogging(logging.stringOnly);
    return;
  }
  logger.setStringLogging(false);
}

export { logger, updateLogging };
