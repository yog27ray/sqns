const chai = require('chai');

// Load Chai assertions
global.expect = chai.expect;
global.assert = chai.assert;
chai.should();

// Initialize Chai plugins
chai.use(require('chai-subset'));
