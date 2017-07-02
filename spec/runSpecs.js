'use strict';
const Path = require('path');
require('dotenv').config({ path: Path.join(__dirname, '.env') });
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');
const NodeJasmineImageDiffTester = require('image-diff-tester/lib/nodeJasmine');
const Config = require('./config');
const NailgunServer = require('./nailgunServer');

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
jasmine.addReporter(new JasmineSpecReporter.SpecReporter({
    spec: {
        displayDuration: true,
        displayStacktrace: true,
        displaySuccessful: true
    },
    summary: {
        displayFailed: true,
        displayPending: true
    }
}));

// Disable default dots reporter since we use jasmine-spec-reporter
jasmine.configureDefaultReporter({
    print: () => {}
});

NailgunServer.startNailgun();

jasmine.onComplete((passed) => {
    NailgunServer.stopNailgun().then(() => {
        // Exit only after nailgun has stopped
        if(passed) {
            process.exit(0);
        }
        else {
            process.exit(1);
        }
    });
});

jasmine.execute();



