'use strict';
const specUtil = require('./util');


describe('tepez-pdf-tools, get signatures', () => {
    let spec;

    afterEach(() => spec = null);

    beforeEach(function () {
        spec = this;
    });

    specUtil.prepareSpecsAssets();
    specUtil.setJasmineTimeout(30000);

    beforeEach(() => {
        spec.pdfTools = require('..');
    });

    const runSpecs = () => {
        describe('when there are no signatures', () => {
            beforeEach(() => spec.expectedSignatures = []);

            it('should resolve to an empty array when using sourceContent', (done) => {
                spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;

                spec.testGetSignatures().then(done, done.fail);
            });

            it('should resolve to an empty array array when using sourcePath', (done) => {
                spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');

                spec.testGetSignatures().then(done, done.fail);
            });
        });

        describe('when there are signatures', () => {
            beforeEach(() => spec.expectedSignatures = [
                {
                    field_name: 'Signature2'
                }
            ]);

            it('should resolve to signatures list when using sourceContent', (done) => {
                spec.pdfToolsOpts.sourceContent = spec.sourceFiles.signed1;

                spec.testGetSignatures().then(done, done.fail);
            });

            it('should resolv to signatures list when using sourcePath', (done) => {
                spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/signed1.pdf');

                spec.testGetSignatures().then(done, done.fail);
            });
        });
    };

    beforeEach(() => {
        spec.pdfToolsOpts = {
            getSignatures: true,
            logFile: spec.logFilePath
        };

        spec.testGetSignatures = () => {
            return spec.pdfTools(spec.pdfToolsOpts).then((signatures) => {
                if (!spec.expectedSignatures) throw new Error('expectedSignatures was not set');
                expect(signatures).toEqual(spec.expectedSignatures);
            });
        }
    });

    describe('when NOT using nailgun', () => {
        beforeEach(() => {
            spec.pdfToolsOpts.nailgun = false;
        });

        runSpecs();
    });

    describe('when using nailgun', () => {
        beforeEach(() => {
            spec.pdfToolsOpts.nailgun = true;
        });

        runSpecs();
    });
});