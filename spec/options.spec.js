'use strict';
const specUtil = require('./util');
const Mockery = require('mockery');
const MockSpawn = require('mock-spawn');


describe('tepez-pdf-tools, CLI options passed to tepez-pdf-tools', () => {
  let spec;

  afterEach(() => spec = null);

  beforeEach(function () {
    spec = this;
  });

  specUtil.prepareSpecsAssets();

  beforeEach(() => {
    spec.spawn = MockSpawn(true);
    Mockery.enable({ useCleanCache: true });
    Mockery.warnOnUnregistered(false);
    Mockery.registerMock('child_process', { spawn: spec.spawn });
    spec.pdfTools = require('..');
  });

  afterEach(() => {
    Mockery.resetCache();
    Mockery.disable();
  });

  describe('when sourcePath and sourceContent are given', () => {
    it('should throw an error', () => {
      expect(() => {
        spec.pdfTools({
          sourcePath: specUtil.getAssetPath('src.pdf'),
          sourceContent: spec.sourceFiles.blank
        });
      }).toThrowError(Error, /"value" contains a conflict between exclusive peers \[sourcePath, sourceContent]/);
    });
  });

  describe('when certpass is given without cert', () => {
    it('should throw an error', () => {
      expect(() => {
        spec.pdfTools({
          sourceContent: spec.sourceFiles.blank,
          certpass: 'password'
        });
      }).toThrowError(Error);
    });
  });

  describe('when certformat is given without cert', () => {
    it('should throw an error', () => {
      expect(() => {
        spec.pdfTools({
          sourceContent: spec.sourceFiles.blank,
          certformat: 'pkcs12'
        });
      }).toThrowError(Error);
    });
  });

  describe('language', () => {
    it('should pass the language option when given', () => {
      spec.pdfTools({
        sourceContent: spec.sourceFiles.blank,
        language: 'en-US'
      });
      expect(spec.spawn.calls.length).toBe(1);

      if (process.platform === 'win32') {
        expect(spec.spawn.calls[0].args).toEqual([
          'pdfTools.Main',
          '--source',
          '-',
          '--destination',
          '-',
          '--language',
          'en-US'
        ]);
      } else {
        expect(spec.spawn.calls[0].args).toEqual([
          '-c',
          'ng pdfTools.Main --source - --destination - --language "en-US" | cat'
        ]);
      }
    });

    it('should NOT pass the language option NOT when given', () => {
      spec.pdfTools({
        sourceContent: spec.sourceFiles.blank
      });
      expect(spec.spawn.calls.length).toBe(1);

      if (process.platform === 'win32') {
        expect(spec.spawn.calls[0].args).toEqual([
          'pdfTools.Main',
          '--source',
          '-',
          '--destination',
          '-'
        ]);
      } else {
        expect(spec.spawn.calls[0].args).toEqual([
          '-c',
          'ng pdfTools.Main --source - --destination - | cat'
        ]);
      }
    });
  });
});