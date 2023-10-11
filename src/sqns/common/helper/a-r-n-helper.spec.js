"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const a_r_n_helper_1 = require("./a-r-n-helper");
describe('ARNHelper', () => {
    context('findResourceClassOfARN', () => {
        it('should return undefined when unknown resource arn is provided', async () => {
            (0, chai_1.expect)(a_r_n_helper_1.ARNHelper.findResourceClassOfARN('unknown-resource')).to.not.exist;
        });
        it('should return Topic for topic arn', async () => {
            (0, chai_1.expect)(a_r_n_helper_1.ARNHelper.findResourceClassOfARN('arn:sqns:sns:1:2:3')).to.equal('Topic');
        });
    });
});
//# sourceMappingURL=a-r-n-helper.spec.js.map