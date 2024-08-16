import { ARN } from '../../../client';

export class ARNHelper {
  static findResourceClassOfARN(resourceARN: ARN): 'Topic' {
    if (/^arn:sqns:sns:[a-zA-Z0-9]*:[a-zA-Z0-9]*:[a-zA-Z0-9]*$/.exec(resourceARN)) {
      return 'Topic';
    }
    return undefined;
  }
}
