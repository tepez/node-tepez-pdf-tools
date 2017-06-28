'use strict';
const Path = require('path');
require('dotenv').config({ path: Path.join(__dirname, '.env') });
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');
const NodeJasmineImageDiffTester = require('image-diff-tester/lib/nodeJasmine');
const Config = require('./config');
const NailgunReporter = require('./nailgunReporter');

const jasmine = new Jasmine();
jasmine.loadConfig({
    spec_dir: 'spec',
    spec_files: [
        '**/*.spec.js'
    ],
    helpers: [
        'helpers/**/*.js'
    ]
});

jasmine.addReporter(new NodeJasmineImageDiffTester(Config.imageDiff));
jasmine.addReporter(new NailgunReporter());
jasmine.addReporter(new JasmineSpecReporter.SpecReporter({
    displaySpecDuration: true,
    displayFailuresSummary: true,
    displaySuccessfulSpec: true,
    displayStacktrace: 'all'
}));

// Disable default dots reporter since we use jasmine-spec-reporter
jasmine.configureDefaultReporter({
    print: () => {}
});

jasmine.execute();



