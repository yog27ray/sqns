import { expect } from 'chai';
import { ARNHelper } from './a-r-n-helper';

describe('ARNHelper', () => {
  context('findResourceClassOfARN', () => {
    it('should return undefined when unknown resource arn is provided', async () => {
      expect(ARNHelper.findResourceClassOfARN('unknown-resource')).to.not.exist;
    });

    it('should return Topic for topic arn', async () => {
      expect(ARNHelper.findResourceClassOfARN('arn:sqns:sns:1:2:3')).to.equal('Topic');
    });
  });
});
