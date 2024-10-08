import { Request, Response } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
import { SQNSError } from '../../../client';
import { AwsXmlFormat } from '../auth/aws-xml-format';
import { logger } from '../logger/logger';

const log = logger.instance('ExpressHelper');

class ExpressHelper {
  static requestHandlerJSON(callback: (req: Request, res: Response) => Promise<any>): ExpressMiddleware {
    return (request: Request, response: Response): void => {
      callback(request, response)
        .catch((error: Error) => {
          log.error(error);
          ExpressHelper.errorHandlerJson(error, response);
        });
    };
  }

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
    if (error instanceof SQNSError) {
      const awsError: SQNSError = error;
      response.status(400).send(AwsXmlFormat.errorResponse(undefined, awsError.code, awsError.message, awsError.detail));
      return;
    }
    response.status(error.code || 400).send(AwsXmlFormat.errorResponse(undefined, `${error.code || 400}`, error.message));
  }

  static errorHandlerJson(error: Error & { code?: number }, response: Response): void {
    if (error instanceof SQNSError) {
      const { code, message, detail }: SQNSError = error;
      response.status(400).json({ code, message, detail });
      return;
    }
    response.status(error.code || 400).send(AwsXmlFormat.errorResponse(undefined, `${error.code || 400}`, error.message));
  }
}

export { ExpressHelper };
