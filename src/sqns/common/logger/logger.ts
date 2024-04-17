import { Logger4Node } from 'logger4node';
import { SQNSLoggingConfig } from '../../../../typings/config';

const logger = new Logger4Node('sqns');

function updateLogging(logging: SQNSLoggingConfig = {}): void {
  if (logging.json) {
    Logger4Node.setJsonLogging(logging.json);
    return;
  }
  Logger4Node.setJsonLogging(false);
  if (logging.stringOnly) {
    Logger4Node.setOnlyStringLogging(logging.stringOnly);
    return;
  }
  Logger4Node.setOnlyStringLogging(false);
}

export { logger, updateLogging };
