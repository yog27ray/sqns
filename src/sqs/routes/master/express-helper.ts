import { NextFunction, Request, Response } from 'express';
import { AwsError } from '../../aws/aws-error';
import { AwsXmlFormat } from '../../aws/aws-xml-format';

type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

class ExpressHelper {
  static requestHandler(callback: (req: Request, res: Response) => Promise<any>): ExpressMiddleware {
    return (request: Request, response: Response): void => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(async () => {
        try {
          await callback(request, response);
        } catch (error) {
          ExpressHelper.errorHandler(error, response);
        }
      }, 0);
    };
  }

  static errorHandler(error: Error & { code: number }, response: Response): void {
    if (error instanceof AwsError) {
      const awsError: AwsError = error;
      response.status(400).send(AwsXmlFormat.errorResponse(awsError.code, awsError.message, awsError.detail));
      return;
    }
    response.status(error.code || 400).json(error.message);
  }
}

export { ExpressMiddleware, ExpressHelper };
