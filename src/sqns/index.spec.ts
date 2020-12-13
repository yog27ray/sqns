import { expect } from 'chai';
import { sqsConfig } from '../setup';
import { Env } from '../test-env';
import { SQNS } from './index';

describe('SQNS', () => {
  context('error handling', () => {
    it('should give error when admin accessKey and secretKey is not provided', async () => {
      try {
        const sqns = new SQNS({ adminSecretKeys: [], region: Env.region, sqs: sqsConfig });
        await Promise.reject({ code: 99, message: 'should not reach here.', sqns });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'MinAdminSecretKeys',
          message: 'At-least one admin secret keys must be provided',
        });
      }
    });
  });
});
