'use strict';
const Path = require('path');
const Fs = require('fs');
const Bluebird = require('bluebird');
const Rimraf = require('rimraf');
const Mkdirp = require('mkdirp');
const _ = require('lodash');
const ImagemagickStream = require('imagemagick-stream');

const RimrafAsync = Bluebird.promisify(Rimraf);
const MkdirpAsync = Bluebird.promisify(Mkdirp);
Bluebird.promisifyAll(Fs);



exports = module.exports = {};

// Remove and re-create the results directory
exports.clearResultDirectory = function () {
    const resultDirPath = Path.join(__dirname, 'results');
    return RimrafAsync(resultDirPath).then(function () {
        return MkdirpAsync(resultDirPath);
    }).return();
};

// return the absolute path of an asset
exports.getAssetPath = function (asset) {
    return Path.join(__dirname, 'assets', asset)
};

// since there are some minor changes between the expected PDF files and the files we
// generate at test time, we just make sure that X percent of them is the same
exports.getMatchRate = function (buffer1, buffer2) {
    if (!buffer1 || !buffer2) {
        return 0;
    }

    let matches = 0;
    for (let i = 0; i < Math.min(buffer1.length, buffer2.length); i++) {
        if (buffer1[i] === buffer2[i]) {
            matches += 1;
        }
    }
    return matches / Math.max(buffer1.length, buffer2.length)
};

exports.readDirectory = function (dir) {
    return Fs.readdirAsync(exports.getAssetPath(dir)).then(function(fileNames) {
        const files = {};
        _.forEach(fileNames, function(fileName) {
            files[Path.basename(fileName, Path.extname(fileName))] =
                Fs.readFileAsync(exports.getAssetPath(Path.join(dir, fileName)));
        });
        return Bluebird.props(files);
    });
};

exports.pdfToPng = function(pdfBuffer, page) {
    const imagemagickStream = ImagemagickStream()
        .set('density', 150)
        .quality(90);
    if (typeof page !== 'undefined') {
        imagemagickStream.input = `pdf:-[${page}]`;
    }
    imagemagickStream.output = 'png:-';

    imagemagickStream.end(pdfBuffer);
    return imagemagickStream;
};
