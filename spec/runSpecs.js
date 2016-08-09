'use strict';
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');
const NodeJasmineImageDiffTester = require('image-diff-tester/lib/nodeJasmine');
const Yargs = require('yargs');


const jasmine = new Jasmine();
jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.addReporter(new JasmineSpecReporter({
    displaySpecDuration: true
}));

/**
    Either config image-diff-tester using command line arguments or using environment variables.

    Rebase the default version

        npm test -- --image-diff-rebase

    Rebase another version

        npm test -- --image-diff-rebase --image-diff-version ubuntu

 */
const argv = Yargs.option('image-diff-rebase', {
    type: 'boolean',
    default: null
}).option('image-diff-version', {
    type: 'string',
    nargs: 1,
    demand: false,
    default: null
}).argv;

const imageDiffBaseVersion = argv.imageDiffVersion || process.env.IMAGE_DIFF_BASE_VERSION || 'default';
const imageDiffMode = (argv.imageDiffRebase ? 'rebase' : null) || process.env.IMAGE_DIFF_MODE || 'test';

jasmine.addReporter(new NodeJasmineImageDiffTester({
    baseDir: `images-diff/base/${imageDiffBaseVersion}`,
    mode: imageDiffMode,
    currentDir: 'images-diff/current',
    diffDir: 'images-diff/diff',
    mismatchThreshold: 0
}));


jasmine.execute();

