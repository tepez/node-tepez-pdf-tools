'use strict';
const Path = require('path');
require('dotenv').config({ path: Path.join(__dirname, '.env') });
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');
const NodeJasmineImageDiffTester = require('image-diff-tester/lib/nodeJasmine');
const Config = require('./config');
const NailgunReporter = require('./nailgunReporter');

const jasmine = new Jasmine();
jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.addReporter(new JasmineSpecReporter({
    displaySpecDuration: true
}));

jasmine.addReporter(new NodeJasmineImageDiffTester(Config.imageDiff));
jasmine.addReporter(new NailgunReporter());
jasmine.execute();



