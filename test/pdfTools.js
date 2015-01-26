var expect = require('chai').expect,
 pdfTools = require('..'),
 path = require('path'),
 fs = require('fs'),
 bluedbird = require('bluebird'),
  tmp = require('tmp'),
  data = require('./assets/data.json');


bluedbird.promisifyAll(fs);
bluedbird.promisifyAll(tmp);


// return the absolute path of an asset
function getAssetPath(asset) {
  return path.join(__dirname, 'assets', asset)
}

// since there are some minor changes between the expected PDF files and the files we
// generate at test time, we just make sure that X percent of them is the same
function getMatchRate(buffer1, buffer2) {
  var matches = 0;
  for (var i = 0; i < Math.min(buffer1.length, buffer2.length); i++) {
    if (buffer1[i] === buffer2[i]) {
      matches += 1;
    }
  }
  return matches / Math.max(buffer1.length, buffer2.length)
}



describe('tepez-pdf-tools', function() {

  describe('when sourcePath and sourceContent are given', function () {
    it('should throw an error', function () {
      expect(function() {
        pdfTools({ sourcePath: getAssetPath('src.pdf'), sourceContent: assets.src });
      }).to.throw(Error, 'value contains a conflict between exclusive peers sourcePath, sourceContent');
    });
  });

  describe('when certpass is given without cert', function () {
    it('should throw an error', function () {
      expect(function() {
        pdfTools({ sourceContent: assets.src, certpass: 'password' });
      }).to.throw(Error);
    });
  });

  describe('when certformat is given without cert', function () {
    it('should throw an error', function () {
      expect(function() {
        pdfTools({ sourceContent: assets.src, certformat: 'pkcs12' });
      }).to.throw(Error);
    });
  });

  var assets, dataPath;

  // prepare a temp data.json file with absolute paths
  before(function (done) {

    // set all the relative paths in data to absolute paths
    data.forEach(function (field) {
      if (field.path) {
        field.path = getAssetPath(field.path);
      }
    });

    // write this to a temp file
    tmp.fileAsync('tepez-pdf-tools-test').spread(function (path, fd, cleanupCallback) {
      dataPath = path;
      dataFd = fd;
      fs.writeSync(fd, JSON.stringify(data));
      fs.closeSync(fd);
    }).delay(1000).then(done);

  });

  // read all the assets once on startup
  before(function(done) {
    bluedbird.props({
      src: fs.readFileAsync(getAssetPath('src.pdf')),
      empty: fs.readFileAsync(getAssetPath('expected/empty.pdf')),
      emptySigned: fs.readFileAsync(getAssetPath('expected/emptySigned.pdf')),
      filled: fs.readFileAsync(getAssetPath('expected/filled.pdf')),
      filledSigned: fs.readFileAsync(getAssetPath('expected/filledSigned.pdf')),
      filledFont: fs.readFileAsync(getAssetPath('expected/filledFont.pdf')),
      filledFontSigned: fs.readFileAsync(getAssetPath('expected/filledFontSigned.pdf')),
      filledPathfont: fs.readFileAsync(getAssetPath('expected/filledPathfont.pdf'))
    }).then(function (_assets) {
      assets = _assets;
    }).then(done);
  });

  var specs = [
    {
      desc: 'should use sourceContent as content of source',
      options: function () { return {
        sourceContent: assets.src
      }; },
      expected: 'empty'
    },
    {
      desc: 'should use sourcePath as path of source file',
      options: function () { return {
        sourcePath: getAssetPath('src.pdf')
      }; },
      expected: 'empty'
    },

    {
      desc: 'should digitally sign file with certificate at cert',
      options: function () { return {
        sourceContent: assets.src,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        certformat: 'pkcs12'
      }; },
      expected: 'emptySigned'
    },
    {
      desc: 'certformat should default to pkcs12',
      options: function () { return {
        sourceContent: assets.src,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password'
      }; },
      expected: 'emptySigned'
    },

    {
      desc: 'should fill form with data in data',
      options: function () { return {
        sourceContent: assets.src,
        data: dataPath,
        // we must set CWD to the assets dir because the `data.json` file uses
        // partial paths
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }; },
      expected: 'filled'
    },

    {
      desc: 'should fill form with data in data (signed)',
      options: function () { return {
        sourceContent: assets.src,
        data: dataPath,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        // we must set CWD to the assets dir because the `data.json` file uses
        // partial paths
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }; },
      expected: 'filledSigned'
    },

    {
      desc: 'should use font as path for substitution font',
      options: function () { return {
        sourceContent: assets.src,
        data: dataPath,
        // font dowloaded from http://www.cunliffethompson.com/font/download.html
        font: getAssetPath('shuneet_03_book_v21.OTF'),
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }; },
      expected: 'filledPathfont'
    },

    {
      desc: 'when font is arialuni.ttf, should use arialuni.ttf embedded in jar',
      options: function () { return {
        sourceContent: assets.src,
        data: dataPath,
        font: 'arialuni.ttf',
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }; },
      expected: 'filledFont'
    },

    {
      desc: 'when font is arialuni.ttf, should use arialuni.ttf embedded in jar (signed)',
      options: function () { return {
        sourceContent: assets.src,
        data: dataPath,
        font: 'arialuni.ttf',
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }; },
      expected: 'filledFontSigned'
    }

  ];

  specs.forEach(function(spec, specIdx) {

    function test(withNailgun, done) {
      var resBuffers = [];

      var pdfToolsOptions = spec.options.call(this);
      pdfToolsOptions.nailgun = withNailgun;

      var stdout = pdfTools(pdfToolsOptions, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);

        var expected = assets[spec.expected];

        // check how much the expected and the result files are common
        var matchRate = getMatchRate(res, expected);

        // if not almost identical (except for dates that change every time we generate)
        // write the file that we got so we can inspect it
        if (matchRate <= 0.99) {
          var resPath = getAssetPath('result/' + spec.expected + '.pdf');
          fs.writeFileSync(resPath, res);
          console.log('Check out ' + resPath + ' to figure out what is wrong with it');
        }

        // it's important not to do the excepts before, because that would raise an error
        // and we won't have the pdf file in the result dir to inspect
        expect(res.length).to.equal(expected.length);
        expect(matchRate).to.be.greaterThan(0.99);

        done()
      });

      stdout.on('data',function(buffer){
        resBuffers.push(buffer);
      });
    }

    describe(spec.desc + ' (spec ' + specIdx + ')', function () {

      it('with nailgun', function (done) {
        test(true, done);
      });

      it('without nailgun', function (done) {
        test(false, done);
      });

    });

  });


});