import { Request, Response } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
import { AwsXmlFormat } from '../auth/aws-xml-format';
import { SQNSErrorCreator } from '../auth/s-q-n-s-error-creator';
import { logger } from '../logger/logger';

const log = logger.instance('ExpressHelper');

class ExpressHelper {
  static requestHandler(callback: (req: Request, res: Response) => Promise<any>): ExpressMiddleware {
    return (request: Request, response: Response): void => {
      callback(request, response)
        .catch((error: Error) => {
          log.error(error);
          ExpressHelper.errorHandler(error, response);
        });
    };
  }

  static errorHandler(error: Error & { code?: number }, response: Response): void {
    if (error instanceof SQNSErrorCreator) {
      const awsError: SQNSErrorCreator = error;
      response.status(400).send(AwsXmlFormat.errorResponse(undefined, awsError.code, awsError.message, awsError.detail));
      return;
    }
    response.status(error.code || 400).send(AwsXmlFormat.errorResponse(undefined, `${error.code || 400}`, error.message));
  }
}

export { ExpressHelper };
