import { expect } from 'chai';
import { ExpressHelper } from './express-helper';

describe('EventHelperSpec', () => {
  context('errorHandling', () => {
    it('should handle error with and without code', async () => {
      let responseCode: number;
      let responseMessage: string;
      const response: any = {
        status: (code: number): { [key: string]: any } => {
          responseCode = code;
          return {
            json: (message: string): void => {
              responseMessage = message;
            },
          };
        },
      };
      let error: Error & { code?: number } = new Error('Test error 1');
      error.code = 100;
      ExpressHelper.errorHandler(error, response);
      expect(responseCode).to.equal(100);
      expect(responseMessage).to.equal('Test error 1');
      error = new Error('Test error 2');
      ExpressHelper.errorHandler(error, response);
      expect(responseCode).to.equal(400);
      expect(responseMessage).to.equal('Test error 2');
    });
  });
});
