import { ARN } from '../../../../typings/typings';

export class ARNHelper {
  static findResourceClassOfARN(resourceARN: ARN): 'Topic' {
    if (new RegExp('^arn:sqns:sns:[a-zA-Z0-9]*:[a-zA-Z0-9]*:[a-zA-Z0-9]*$').exec(resourceARN)) {
      return 'Topic';
    }
    return undefined;
  }
}
