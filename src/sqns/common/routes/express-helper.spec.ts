import { expect } from 'chai';
import { ExpressHelper } from './express-helper';

describe('EventHelperSpec', () => {
  context('errorHandling', () => {
    it('should handle error with and without code', async () => {
      let responseCode: number = 0;
      let responseMessage: string = '';
      const response: unknown = {
        status: (code: number): Record<string, unknown> => {
          responseCode = code;
          return {
            send: (message: string): void => {
              responseMessage = message;
            },
          };
        },
      };
      let error: Error & { code?: number } = new Error('Test error 1');
      error.code = 100;
      ExpressHelper.errorHandler(error, response);
      expect(responseCode).to.equal(100);
      expect(responseMessage).to.equal('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<ErrorResponse>\n'
        + '  <RequestId/>\n'
        + '  <Error>\n'
        + '    <Type>Sender</Type>\n'
        + '    <Code>100</Code>\n'
        + '    <Message>Test error 1</Message>\n'
        + '    <Detail/>\n'
        + '  </Error>\n'
        + '</ErrorResponse>');
      error = new Error('Test error 2');
      ExpressHelper.errorHandler(error, response);
      expect(responseCode).to.equal(400);
      expect(responseMessage).to.equal('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<ErrorResponse>\n'
        + '  <RequestId/>\n'
        + '  <Error>\n'
        + '    <Type>Sender</Type>\n'
        + '    <Code>400</Code>\n'
        + '    <Message>Test error 2</Message>\n'
        + '    <Detail/>\n'
        + '  </Error>\n'
        + '</ErrorResponse>');
    });
  });
});
