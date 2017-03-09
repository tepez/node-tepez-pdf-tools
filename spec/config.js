'use strict';
const Yargs = require('yargs');


const internals = {};

/**
 Either config image-diff-tester using command line arguments or using environment variables.

 Rebase the default version

 npm test -- --image-diff-rebase

 Rebase another version

 npm test -- --image-diff-rebase --image-diff-version ubuntu

 */
internals.getImageDiffOptions = function () {
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

    return {
        baseDir: `images-diff/base/${imageDiffBaseVersion}`,
        mode: imageDiffMode,
        currentDir: 'images-diff/current',
        diffDir: 'images-diff/diff',
        deleteIdenticalFromCurrent: true,
        mismatchThreshold: 0
    }
};

internals.checkEnv = function () {
    if (!process.env.TP_PDF_TOOLS_NG_SERVER_JAR_PATH) {
        throw new Error('TP_PDF_TOOLS_NG_SERVER_JAR_PATH must be defined');
    }
};

internals.checkEnv();

exports = module.exports = {
    imageDiff: internals.getImageDiffOptions(),
    ngServerJarPath: process.env.TP_PDF_TOOLS_NG_SERVER_JAR_PATH
};

