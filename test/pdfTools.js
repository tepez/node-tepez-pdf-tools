var expect = require('chai').expect,
 pdfTools = require('..'),
 path = require('path'),
 fs = require('fs'),
 bluedbird = require('bluebird');

bluedbird.promisifyAll(fs);

// return the absolute path of an asset
function getAssetPath(asset) {
  return path.join(__dirname, 'assets', asset)
}

// since there are some minor changes between the expected PDF files and the files we
// generate at test time, we just make sure that X percent of them is the same
function matchRate(buffer1, buffer2) {
  var matches = 0;
  for (var i = 0; i < Math.min(buffer1.length, buffer2.length); i++) {
    if (buffer1[i] === buffer2[i]) {
      matches += 1;
    }
  }
  return matches / Math.max(buffer1.length, buffer2.length)
}


describe('tepez-pdf-tools', function() {

  var assets, resBuffers, stdout;

  function accumulateResult() {
    stdout.on('data',function(buffer){
      resBuffers.push(buffer);
    });
  }

  // read all the assets once on startup
  before(function(done) {
    bluedbird.props({
      src: fs.readFileAsync(getAssetPath('src.pdf')),
      empty: fs.readFileAsync(getAssetPath('expected/empty.pdf')),
      emptySigned: fs.readFileAsync(getAssetPath('expected/empty_signed.pdf')),
      filled: fs.readFileAsync(getAssetPath('expected/filled.pdf')),
      filledSigned: fs.readFileAsync(getAssetPath('expected/filled_signed.pdf')),
      filledFont: fs.readFileAsync(getAssetPath('expected/filled_font.pdf')),
      filledFontSigned: fs.readFileAsync(getAssetPath('expected/filled_font_signed.pdf')),

      filledPathfont: fs.readFileAsync(getAssetPath('expected/filled_fontpath.pdf'))
    }).then(function (_assets) {
      assets = _assets;
    }).then(done);
  });

  beforeEach(function() {
    resBuffers = [];
  });

  describe('when sourcePath and sourceContent are given', function () {
    it('should throw an error', function () {
      expect(function() {
        pdfTools({ sourcePath: getAssetPath('src.pdf'), sourceContent: assets.src });
      }).to.throw(Error, 'value contains a conflict between exclusive peers sourcePath, sourceContent');
    });
  });

  describe('sourcePath option', function () {
    it('should use this file as the source', function (done) {
      stdout = pdfTools({ sourcePath: getAssetPath('src.pdf') }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);

        expect(res.length).to.equal(assets.empty.length);
        expect(matchRate(res, assets.empty)).to.be.greaterThan(0.99);

        done()
      });
      accumulateResult();
    });
  });

  describe('sourceContent option', function () {
    it('should use it as the source', function (done) {
      stdout = pdfTools({ sourceContent: assets.src }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.empty.length);
        expect(matchRate(res, assets.empty)).to.be.greaterThan(0.99);

        done()
      });
      accumulateResult();
    });
  });

  describe('cert option', function () {

    it('should digitally sign the file with the given certificate', function (done) {
      stdout = pdfTools({
          sourceContent: assets.src,
          cert: getAssetPath('certificate.pfx'),
          certpass: 'password',
          certformat: 'pkcs12'
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.emptySigned.length);
        expect(matchRate(res, assets.emptySigned)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });

    it('certformat should default to pkcs12', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password'
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.emptySigned.length);
        expect(matchRate(res, assets.emptySigned)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    })


  });



  describe ('data option', function () {

    it ('should use data in given path to populate the form', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        data: getAssetPath('data.json'),
        // we must set CWD to the assets dir because the `data.json` file uses
        // partial paths
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.filled.length);
        expect(matchRate(res, assets.filled)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });


    it ('should use data in given path to populate the form (sigend)', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        data: getAssetPath('data.json'),
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        // we must set CWD to the assets dir because the `data.json` file uses
        // partial paths
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.filledSigned.length);
        expect(matchRate(res, assets.filledSigned)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });

  });

  describe('when font is a path', function () {

    it ('should font in this path', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        data: getAssetPath('data.json'),
        // font dowloaded from http://www.cunliffethompson.com/font/download.html
        font: getAssetPath('shuneet_03_book_v21.OTF'),
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.filledPathfont.length);
        expect(matchRate(res, assets.filledPathfont)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });

  });

  describe('when font is arialuni.ttf', function () {
    it ('should arialuni.ttf embedded in jar', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        data: getAssetPath('data.json'),
        font: 'arialuni.ttf',
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.filledFont.length);
        expect(matchRate(res, assets.filledFont)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });


    it ('should arialuni.ttf embedded in jar (signed)', function (done) {
      stdout = pdfTools({
        sourceContent: assets.src,
        data: getAssetPath('data.json'),
        font: 'arialuni.ttf',
        cert: getAssetPath('certificate.pfx'),
        certpass: 'password',
        spawnOptions: { cwd: path.join(__dirname, 'assets') }
      }, function (err) {
        var res = Buffer.concat(resBuffers);
        expect(err).to.equal(null);
        expect(res.length).to.equal(assets.filledFontSigned.length);
        expect(matchRate(res, assets.filledFontSigned)).to.be.greaterThan(0.99);
        done()
      });
      accumulateResult();
    });

  })




});