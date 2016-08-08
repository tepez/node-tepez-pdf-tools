'use strict';

const pdfTools = require('..');
const Path = require('path');
const Fs = require('fs');
const Bluebird = require('bluebird');
const Tmp = require('tmp');
const Rimraf = require('rimraf');
const Mkdirp = require('mkdirp');
const _ = require('lodash');

// Set to true to create the result of every test, to manually check the result files
const alwaysWriteResults = false;

const logFilePath = Path.join(__dirname, '../tepez-pdf-tools.log');

const RimrafAsync = Bluebird.promisify(Rimraf);
const MkdirpAsync = Bluebird.promisify(Mkdirp);
Bluebird.promisifyAll(Fs);
Bluebird.promisifyAll(Tmp,{multiArgs: true});

// return the absolute path of an asset
function getAssetPath(asset) {
  return Path.join(__dirname, 'assets', asset)
}

// since there are some minor changes between the expected PDF files and the files we
// generate at test time, we just make sure that X percent of them is the same
function getMatchRate(buffer1, buffer2) {
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
}

function readDirectory(dir) {
  return Fs.readdirAsync(getAssetPath(dir)).then(function(fileNames) {
    const files = {};
    _.forEach(fileNames, function(fileName) {
      files[Path.basename(fileName, Path.extname(fileName))] =
        Fs.readFileAsync(getAssetPath(Path.join(dir, fileName)));
    });
    return Bluebird.props(files);
  });
}


describe('tepez-pdf-tools', function() {

  let sourceFiles, expectedFiles, imageFiles;

  // remove the "result" directory
  beforeAll(function(done) {
    const resultDirPath = Path.join(__dirname, 'results');
    RimrafAsync(resultDirPath).then(function () {
      return MkdirpAsync(resultDirPath);
    }).return().then(done);
  });

  // read source files
  beforeAll(function(done) {
    readDirectory('src').then(function(files) {
      sourceFiles = files;
    }).then(done);
  });

  // read expected files
  beforeAll(function(done) {
    readDirectory('expected').then(function(files) {
      expectedFiles = files;
    }).then(done);
  });

  // read image files
  beforeAll(function(done) {
    readDirectory('img').then(function(files) {
      // encode each image as base64
      _.forEach(files, function(contet, key) {
        files[key] = new Buffer(contet).toString('base64');
      });
      imageFiles = files;
    }).then(done);
  });

  describe('options', function() {
    describe('when sourcePath and sourceContent are given', function () {
      it('should throw an error', function () {
        expect(function() {
          pdfTools({ sourcePath: getAssetPath('src.pdf'), sourceContent: sourceFiles.blank });
        }).toThrowError(Error, /"value" contains a conflict between exclusive peers \[sourcePath, sourceContent]/);
      });
    });

    describe('when certpass is given without cert', function () {
      it('should throw an error', function () {
        expect(function() {
          pdfTools({ sourceContent: sourceFiles.blank, certpass: 'password' });
        }).toThrowError(Error);
      });
    });

    describe('when certformat is given without cert', function () {
      it('should throw an error', function () {
        expect(function() {
          pdfTools({ sourceContent: sourceFiles.blank, certformat: 'pkcs12' });
        }).toThrowError(Error);
      });
    });
  });


  const specs = [
    {
      name: 'sourcePath',
      expected: 'textValid',
      expectedMatchRate: 0.997,
      desc: 'when source is given using sourcePath',
      data: [
        { type: 'text', key:'field1', value: 'value 1' },
        { type: 'text', key:'field2', value: 'value 2' }
      ],
      options: function () { return {
        sourcePath: getAssetPath('src/text.pdf')
      }; }
    },
    {
      name: 'textValid',
      expected: 'textValid',
      expectedMatchRate: 0.997,
      desc: 'text - type is omitted',
      data: [
        { type: 'text', key:'field1', value: 'value 1' },
        { type: 'text', key:'field2', value: 'value 2' }
      ],
      options: function () { return {
        sourceContent: sourceFiles.text
      }; }
    },
    {
      name: 'textOmittedType',
      expected: 'textValid',
      expectedMatchRate: 0.997,
      desc: 'text - type is omitted (text is default type)',
      data: [
        { key:'field1', value: 'value 1' },
        { key:'field2', value: 'value 2' }
      ],
      options: function () { return {
        sourceContent: sourceFiles.text
      }; }
    },
    {
      name: 'textWrongType',
      expected: 'textNoValue',
      expectedMatchRate: 0.997,
      desc: 'text - wrong type (checkbox instead of text)',
      data: [
        { type: 'checkbox', key:'field1', value: true },
        { type: 'checkbox', key:'field2', value: 'xxx' }
      ],
      options: function () { return {
        sourceContent: sourceFiles.text
      }; }
    },
    {
      name: 'textNoValue',
      expected: 'textNoValue',
      expectedMatchRate: 0.997,
      desc: 'text - no value',
      data: [],
      options: function () { return {
        sourceContent: sourceFiles.text
      }; }
    },
    {
      name: 'checkboxChecked',
      expected: 'checkboxChecked',
      expectedMatchRate: 0.997,
      desc: 'checkbox - checked',
      data: [ { type: 'checkbox', key:'checkbox', value: true } ],
      options: function () { return {
        sourceContent: sourceFiles.checkbox
      }; }
    },
    {
      name: 'checkboxNotChecked',
      expected: 'checkboxNotChecked',
      expectedMatchRate: 0.997,
      desc: 'checkbox - not checked',
      data: [ { type: 'checkbox', key:'checkbox', value: false } ],
      options: function () { return {
        sourceContent: sourceFiles.checkbox
      }; }
    },
    {
      name: 'checkboxWrongType',
      expected: 'checkboxNotChecked',
      expectedMatchRate: 0.997,
      desc: 'checkbox - wrong type (text instead of checkbox)',
      data: [ { type: 'text', key:'checkbox', value: 'xxx' } ],
      options: function () { return {
        sourceContent: sourceFiles.checkbox
      }; }
    },
    {
      name: 'checkboxInvalidValue',
      expected: 'checkboxNotChecked',
      expectedMatchRate: 0.997,
      desc: 'checkbox - invalid value (string instead of true/false)',
      data: [ { type: 'checkbox', key:'checkbox', value: 'xxx' } ],
      options: function () { return {
        sourceContent: sourceFiles.checkbox
      }; }
    },
    {
      name: 'checkboxNoValue',
      expected: 'checkboxNotChecked',
      expectedMatchRate: 0.997,
      desc: 'checkbox - no value',
      data: [],
      options: function () { return {
        sourceContent: sourceFiles.checkbox
      }; }
    },
    {
      name: 'imagePath',
      expected: 'imagePath',
      expectedMatchRate: 0.998,
      desc: 'image by path',
      options: function () { return {
        sourceContent: sourceFiles.image
      }; },
      data: function() { return [
        { type: 'img',  key: 'image', path: getAssetPath('img/image.png') }
      ]; }
    },
    {
      name: 'imageContent',
      expected: 'imageContent',
      expectedMatchRate: 0.998,
      desc: 'image by content',
      options: function () { return {
        sourceContent: sourceFiles.image
      }; },
      data: function() { return [
        { type: 'img',  key: 'image', content: imageFiles.image2 }
      ]; }
    },
    {
      name: 'imageNewPagePath',
      expected: 'imageNewPagePath',
      expectedMatchRate: 0.99,
      desc: 'image by path on a new page',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [
        {
          type: 'img',
          key: 'image',
          path: getAssetPath('img/image.png'),
          placement: 'new-page'
        },
        {
          type: 'img',
          key: 'image2',
          path: getAssetPath('img/image2.jpg'),
          placement: 'new-page'
        },
        {
          type: 'img',
          key: 'image3',
          path: getAssetPath('img/image3.gif'),
          placement: 'new-page'
        }
      ]; }
    },
    {
      name: 'imageNewPageContent',
      expected: 'imageNewPageContent',
      expectedMatchRate: 0.99,
      desc: 'image by content on a new page',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [
        {
          type: 'img',
          key: 'image',
          content: imageFiles.image,
          placement: 'new-page'
        },
        {
          type: 'img',
          key: 'image',
          content: imageFiles.image2,
          placement: 'new-page'
        },
        {
          type: 'img',
          key: 'image',
          content: imageFiles.image3,
          placement: 'new-page'
        }
      ]; }
    },
    {
      name: 'attachmentPath',
      expected: 'attachmentPath',
      expectedMatchRate: 0.997,
      desc: 'attachment by path (no desc and no fileDisplay)',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: [
        { type: 'attachment',  path: getAssetPath('img/image.png') },
        { type: 'attachment',  path: getAssetPath('img/image2.jpg') }
      ]
    },
    {
      name: 'attachmentPathDesc',
      expected: 'attachmentPathDesc',
      expectedMatchRate: 0.999,
      desc: 'attachment by path, with desc (no fileDisplay)',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: [
        {
          type: 'attachment',
          path: getAssetPath('img/image.png'),
          desc: 'mock file description'
        },
        {
          type: 'attachment',
          path: getAssetPath('img/image2.jpg'),
          desc: 'mock file description 2'
        }
      ]
    },
    {
      name: 'attachmentPathFileDisplay',
      expected: 'attachmentPathFileDisplay',
      expectedMatchRate: 0.999,
      desc: 'attachment by path, with fileDisplay (no desc)',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: [
        {
          type: 'attachment',
          path: getAssetPath('img/image.png'),
          fileDisplay: 'mockFileDisplay.png'
        },
        {
          type: 'attachment',
          path: getAssetPath('img/image2.jpg'),
          fileDisplay: 'mockFileDisplay.jpg'
        }
      ]
    },
    {
      name: 'attachmentPathDescFileDisplay',
      expected: 'attachmentPathDescFileDisplay',
      expectedMatchRate: 0.999,
      desc: 'attachment by path, with fileDisplay and desc',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: [
        {
          type: 'attachment',
          path: getAssetPath('img/image.png'),
          fileDisplay: 'mockFileDisplay.png',
          desc: 'mock file description'
        },
        {
          type: 'attachment',
          path: getAssetPath('img/image2.jpg'),
          fileDisplay: 'mockFileDisplay.jpg',
          desc: 'mock file description 2'
        }
      ]
    },
    {
      name: 'attachmentContent',
      expected: 'attachmentContent',
      expectedMatchRate: 0.996,
      desc: 'attachment by content (no desc and no fileDisplay) - should skip field since we cannot determine a displayName',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [ {
        type: 'attachment',
        content: imageFiles.image
      } ]; }
    },
    {
      name: 'attachmentContentDesc',
      expected: 'attachmentContentDesc',
      expectedMatchRate: 0.996,
      desc: 'attachment by content, with desc (no fileDisplay) - should skip field since we cannot determine a displayName',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [ {
        type: 'attachment',
        content: imageFiles.image,
        desc: 'mock file description'
      } ]; }
    },
    {
      name: 'attachmentContentFileDisplay',
      expected: 'attachmentContentFileDisplay',
      expectedMatchRate: 0.999,
      desc: 'attachment by content, with fileDisplay (no desc)',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [ {
        type: 'attachment',
        content: imageFiles.image,
        fileDisplay: 'mockFileDisplay.png'
      } ]; }
    },
    {
      name: 'attachmentContentDescFileDisplay',
      expected: 'attachmentContentDescFileDisplay',
      expectedMatchRate: 0.999,
      desc: 'attachment by content, with fileDisplay and desc',
      options: function () { return {
        sourceContent: sourceFiles.blank
      }; },
      data: function() { return [ {
        type: 'attachment',
        content: imageFiles.image,
        fileDisplay: 'mockFileDisplay.png',
        desc: 'mock file description'
      } ]; }
    },
    {
      name: 'signed',
      expected: 'signed',
      expectedMatchRate: 0.99,
      desc: 'should digitally sign file with certificate at cert',
      options: function () { return {
        sourceContent: sourceFiles.text,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        certformat: 'pkcs12'
      }; },
      data: [
        { type: 'text', key:'field1', value: 'value 1' },
        { type: 'text', key:'field2', value: 'value 2' }
      ]
    },
    {
      name: 'signedNoCertFormat',
      expected: 'signed',
      expectedMatchRate: 0.99,
      desc: 'certformat should default to pkcs12',
      options: function () { return {
        sourceContent: sourceFiles.text,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password'
      }; },
      data: [
        { type: 'text', key:'field1', value: 'value 1' },
        { type: 'text', key:'field2', value: 'value 2' }
      ]
    },
    {
      name: 'fontPath',
      expected: 'fontPath',
      expectedMatchRate: 0.997,
      desc: 'should use font as path for substitution font',
      options: function () { return {
        sourceContent: sourceFiles.text,
        // font downloaded from http://www.cunliffethompson.com/font/download.html
        font: getAssetPath('shuneet_03_book_v21.OTF')
        //spawnOptions: { cwd: Path.join(__dirname, 'assets') }
      }; },
      data: [
        { type: 'text', key:'field1', value: 'בלה בלה בלה' },
        { type: 'text', key:'field2', value: 'ידה ידה ידה' }
      ]
    },
    {
      name: 'fontEmbedded',
      expected: 'fontEmbedded',
      expectedMatchRate: 0.999,
      desc: 'when font is arialuni.ttf, should use arialuni.ttf embedded in jar',
      options: function () { return {
        sourceContent: sourceFiles.text,
        font: 'arialuni.ttf'
        //spawnOptions: { cwd: Path.join(__dirname, 'assets') }
      }; },
      data: [
        { type: 'text', key:'field1', value: 'בלה בלה בלה' },
        { type: 'text', key:'field2', value: 'ידה ידה ידה' }
      ]
    }
  ];

  specs.forEach(function(specOpts, specIdx) {
    let spec;

    function runTest(useNailgun, done) {
      const resBuffers = [];

      const pdfToolsOptions = {
        data: spec.dataFilePath,
        nailgun: useNailgun,
        logLevel: 'INFO',
        logFile: logFilePath
      };

      if (specOpts.options) {
        _.assign(pdfToolsOptions, specOpts.options.call(this));
      }

      const expectedMatchRate = specOpts.expectedMatchRate || 0.99;

      const stdout = pdfTools(pdfToolsOptions, function (err) {
        const res = Buffer.concat(resBuffers);
        expect(err).toBe(null);

        const resPath = Path.join(__dirname, 'results', specOpts.name + (useNailgun ? '-nailgun' : '') + '.pdf');

        if (specOpts.expected) {

          const expected = expectedFiles[specOpts.expected];

          // check how much the expected and the result files are common
          const matchRate = getMatchRate(res, expected);

          //console.log(matchRate);

          // if not almost identical (except for dates that change every time we generate)
          // write the file that we got so we can inspect it
          if (matchRate <= expectedMatchRate) {
            Fs.writeFileSync(resPath, res);
            console.log(`Check out ${resPath} to figure out what is wrong with it`);
          } else if (alwaysWriteResults) {
            Fs.writeFileSync(resPath, res);
          }

          // it's important not to do the expectations before, because that would raise an
          // error and we won't have the pdf file in the result dir to inspect
          expect(res.length).toBe(expected ? expected.length : -1);
          expect(matchRate).toBeGreaterThan(expectedMatchRate);

        } else {
          Fs.writeFileSync(resPath, res);
          console.log(`${resPath} created. Add it to expected files if it it OK`);
        }

        done()
      });

      stdout.on('data',function(buffer){
        resBuffers.push(buffer);
      });
    }

    const describeFn = specOpts.fit ? fdescribe : describe;
    describeFn(`${specOpts.desc} (spec ${specIdx} )`, function () {
      // Create a temporary file with the field data
      beforeEach(function (done) {
        spec = this;
        let data = specOpts.data;
        if (_.isFunction(specOpts.data)) {
          data = specOpts.data.call(this);
        }

        Tmp.fileAsync('tepez-pdf-tools-test').spread((path, fd) => {
          spec.dataFilePath = path;
          Fs.writeSync(fd, JSON.stringify(data));
          Fs.closeSync(fd);
        }).delay(1000).then(done);
      });

      it('normal execution', function (done) {
        runTest(false, done);
      });

      it('using nailgun', function (done) {
        runTest(true, done);
      });
    });
  });

  it('should have created only a single log file and release it', () => {
    expect(Fs.lstatSync(logFilePath).isFile()).toBe(true);
    expect(() => { Fs.lstatSync(`${logFilePath}.lck`); }).toThrow();
    expect(() => { Fs.lstatSync(`${logFilePath}.1`); }).toThrow();
    expect(() => { Fs.lstatSync(`${logFilePath}.1.lck`); }).toThrow();
  });
});