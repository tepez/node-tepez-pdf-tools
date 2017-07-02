'use strict';
const specUtil = require('./util');
const Path = require('path');
const _ = require('lodash');
const Bluebird = require('bluebird');
const Fs = require('fs');
const Tmp = require('tmp');
const Joi = require('joi');


Bluebird.promisifyAll(Tmp,{multiArgs: true});

describe('tepez-pdf-tools, modifying PDF files', () => {
  let spec;

  afterEach(() => spec = null);

  beforeEach(function () {
    spec = this;
  });

  beforeAll((done) => {
    jasmine.getEnv().imageDiffTester.initDirectories().then(done, done.fail);
  });

  beforeAll((done) => {
    specUtil.clearResultDirectory().then(done, done.fail);
  });

  specUtil.prepareSpecsAssets();

  beforeEach(() => {
    spec.origDefaultTimeoutInterval = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  });

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = spec.origDefaultTimeoutInterval;
  });

  beforeEach(() => {
    spec.pdfTools = require('..');

    spec.pdfToolsOpts = {
      logLevel: 'INFO',
      logFile: spec.logFilePath
    };
    
    spec.pdfToolsData = null;
  });

  // Create a temporary file with the fields data and add it to the options passed
  // to tepez-pdf-tools
  const initPdfToolsData = () => {
    if (!spec.pdfToolsData) return Bluebird.resolve();
    
    return Tmp.fileAsync('tepez-pdf-tools-test').spread((path, fd) => {
      spec.dataFilePath = path;
      Fs.writeSync(fd, JSON.stringify(spec.pdfToolsData));
      Fs.closeSync(fd);

      spec.pdfToolsOpts.data = spec.dataFilePath;
    }).delay(1000);
  };

  // Run tepez-pdf-tools and capture the result file
  const modifyPdf = (name) => {
    return new Promise((resolve, reject) => {
      const resBuffers = [];

      const stdout = spec.pdfTools(spec.pdfToolsOpts, (err) => {
        const res = Buffer.concat(resBuffers);
        spec.resultPdf = res;
        if (err) return reject(err);

        const resPath = Path.join(
            __dirname,
            'results',
            name + (spec.pdfToolsOpts.nailgun ? '-nailgun' : '') + '.pdf'
        );
        Fs.writeFileSync(resPath, res);
        resolve();
      });

      stdout.on('data',(buffer) => {
        resBuffers.push(buffer);
      });
    });
  };

  // Test the attachments added to the resulted PDF
  const testAttachments = () => {
    return spec.pdfTools({
      sourceContent: spec.resultPdf,
      getAttachments: true
    }).then((attachments) => {
      expect(attachments).toEqual(spec.expectedAttachments || []);
    });
  };

  // Visually test the resulted PDF against the expected image
  const testPdfImageDiff = (name, expectedPagesNum) => {
    let imageDiffTester = jasmine.getEnv().imageDiffTester;

    // Take each page of the PDF as a separate image
    return Bluebird.each(_.range(0, expectedPagesNum), (pageNum) => {

      const pngStream = specUtil.pdfToPng(spec.resultPdf, pageNum);
      // the ImagemagickStream might multiple errors
      // but StreamToArray removes the error listener after the first error
      // so if add this listener so we won't get errors like:
      //    events.js:160
      //      throw er; // Unhandled 'error' event
      // which will stop jasmine
      pngStream.on('error', (err) => {
        console.log(`Imagemagick error: ${err}`);
      });

      return imageDiffTester.imageTaken(`${name}-${pageNum}`, pngStream);
    });
  };

  const testSignatures = () => {
    if (!spec.expectedSignatures) throw new Error('must set spec.expectedSignatures');
    return spec.pdfTools({
      sourceContent: spec.resultPdf,
      getSignatures: true
    }).then((signatures) => {
      expect(signatures).toEqual(spec.expectedSignatures);
    });
  };

  const modifyPdfAndTest = (name, expectedPagesNum) => {
    return initPdfToolsData().then(() => {
      return modifyPdf(name);
    }).then(() => {
      return testPdfImageDiff(name, expectedPagesNum);
    }).then(() => {
      return testAttachments();
    });
  };

  const runSpecs = () => {
    describe('text fields', () => {
      describe('when type is "text"', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'text', key:'field1', value: 'value 1' },
            { type: 'text', key:'field2', value: 'value 2' }
          ];
        });

        it('should fill text fields when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/text.pdf');
          modifyPdfAndTest('text_valid_source_path', 1).then(done, done.fail);
        });

        it('should fill text fields when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.text;
          modifyPdfAndTest('text_valid_source_content', 1).then(done, done.fail);
        });
      });

      describe('when type is NOT given', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { key:'field1', value: 'value 1' },
            { key:'field2', value: 'value 1' }
          ];
        });

        it('should fill text fields when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/text.pdf');
          modifyPdfAndTest('text_no_type_source_path', 1).then(done, done.fail);
        });

        it('should fill text fields when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.text;
          modifyPdfAndTest('text_no_type_source_content', 1).then(done, done.fail);
        });
      });

      describe('when type is invalid', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'xxx', key:'field1', value: 'value 1' },
            { type: [ 'text' ], key:'field1', value: 'value 1' },
            { type: { xxx: 'text' }, key:'field1', value: 'value 1' },
            { type: true, key:'field2', value: 'value 2' }
          ];
        });

        it('should fill text fields when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/text.pdf');
          modifyPdfAndTest('text_invalid_type_source_path', 1).then(done, done.fail);
        });

        it('should fill text fields when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.text;
          modifyPdfAndTest('text_invalid_type_source_content', 1).then(done, done.fail);
        });
      });

      describe('when type is value is not given or null', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'text', key:'field1' },
            { type: 'text', key:'field2', value: null }
          ];
        });

        it('should fill text fields when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/text.pdf');
          modifyPdfAndTest('text_no_value_source_path', 1).then(done, done.fail);
        });

        it('should fill text fields when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.text;
          modifyPdfAndTest('text_no_value_source_content', 1).then(done, done.fail);
        });
      });
    });

    describe('checkbox field', () => {
      describe('when value=true', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'checkbox', key:'checkbox', value: true }
          ];
        });

        it('should check field when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/checkbox.pdf');
          modifyPdfAndTest('checkbox_checked_source_path', 1).then(done, done.fail);
        });

        it('should check field when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.checkbox;
          modifyPdfAndTest('checkbox_checked_source_content', 1).then(done, done.fail);
        });
      });

      describe('when value=false', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'checkbox', key:'checkbox', value: false }
          ];
        });

        it('should check field when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/checkbox.pdf');
          modifyPdfAndTest('checkbox_not_checked_source_path', 1).then(done, done.fail);
        });

        it('should check field when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.checkbox;
          modifyPdfAndTest('checkbox_not_checked_source_content', 1).then(done, done.fail);
        });
      });

      describe('when type is "text" (wrong type)', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'text', key:'checkbox', value: false }
          ];
        });

        it('should check field when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/checkbox.pdf');
          modifyPdfAndTest('checkbox_wrong_type_source_path', 1).then(done, done.fail);
        });

        it('should check field when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.checkbox;
          modifyPdfAndTest('checkbox_wrong_type_source_content', 1).then(done, done.fail);
        });
      });

      describe('when value is not given', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'checkbox', key:'checkbox' }
          ];
        });

        it('should check field when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/checkbox.pdf');
          modifyPdfAndTest('checkbox_no_value_source_path', 1).then(done, done.fail);
        });

        it('should check field when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.checkbox;
          modifyPdfAndTest('checkbox_no_value_source_content', 1).then(done, done.fail);
        });
      });

      describe('when value is not null', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            { type: 'checkbox', key:'checkbox', value: null }
          ];
        });

        it('should check field when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/checkbox.pdf');
          modifyPdfAndTest('checkbox_null_value_source_path', 1).then(done, done.fail);
        });

        it('should check field when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.checkbox;
          modifyPdfAndTest('checkbox_null_value_source_content', 1).then(done, done.fail);
        });
      });
    });

    describe('images', () => {
      describe('when should be added on field', () => {
        describe('when given using path', () => {
          beforeEach(() => {
            spec.pdfToolsData = [
              { type: 'img',  key: 'image', path: specUtil.getAssetPath('img/image1.png') }
            ];
          });

          it('should add image on top of field when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/image.pdf');
            modifyPdfAndTest('image_on_field_by_path_source_path', 1).then(done, done.fail);
          });

          it('should add image on top of field when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.image;
            modifyPdfAndTest('image_on_field_by_path_source_content', 1).then(done, done.fail);
          });
        });

        describe('when given using content', () => {
          beforeEach(() => {
            spec.pdfToolsData = [
              { type: 'img',  key: 'image', content: spec.imageFiles.image2 }
            ];
          });

          it('should add image on top of field when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/image.pdf');
            modifyPdfAndTest('image_on_field_by_content_source_path', 1).then(done, done.fail);
          });

          it('should add image on top of field when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.image;
            modifyPdfAndTest('image_on_field_by_content_source_content', 1).then(done, done.fail);
          });
        });
      });

      describe('when should be added on new-page', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            {
              type: 'img',
              path: specUtil.getAssetPath('img/image1.png'),
              placement: 'new-page',
              'max-width': 75
            },
            {
              type: 'img',
              path: specUtil.getAssetPath('img/image2.jpg'),
              placement: 'new-page'
              // max-width should default to 0.5
            },
            {
              type: 'img',
              path: specUtil.getAssetPath('img/image3.gif'),
              placement: 'new-page',
              'max-width': 25
            }
          ];
        });

        it('should add images on new pages when using sourcePath', (done) => {
          spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/image.pdf');
          modifyPdfAndTest('image_new_page_source_path', 4).then(done, done.fail);
        });

        it('should add images on new pages when using sourceContent', (done) => {
          spec.pdfToolsOpts.sourceContent = spec.sourceFiles.image;
          modifyPdfAndTest('image_new_page_source_content', 4).then(done, done.fail);
        });
      });
    });

    describe('attachments', () => {
      beforeEach(() => {
        spec.expectedAttachments = [
          {
            content: spec.imageFiles.image1,
            desc: '',
            filename: 'image1.png',
            size: 59224
          },
          {
            content: spec.imageFiles.image2,
            desc: '',
            filename: 'image2.jpg',
            size: 11428
          }
        ];
      });

      describe('when given using path', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            {
              type: 'attachment',
              path: specUtil.getAssetPath('img/image1.png')
            },
            {
              type: 'attachment',
              path: specUtil.getAssetPath('img/image2.jpg')
            }
          ];
        });

        describe('no fileDisplay or desc', () => {
          it('should add attachments when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');
            modifyPdfAndTest('attachment_path_source_path', 1).then(done, done.fail);
          });

          it('should add attachments when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
            modifyPdfAndTest('attachment_path_source_content', 1).then(done, done.fail);
          });
        });

        describe('fileDisplay or desc', () => {
          beforeEach(() => {
            spec.pdfToolsData[0].fileDisplay = 'mock display name 1.pdf';
            spec.pdfToolsData[1].desc = 'mock description 2';

            spec.expectedAttachments[0].filename = 'mock display name 1.pdf';
            spec.expectedAttachments[1].desc = 'mock description 2';
          });

          it('should add attachments when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');
            modifyPdfAndTest('attachment_path_file_display_or_desc_source_path', 1).then(done, done.fail);
          });

          it('should add attachments when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
            modifyPdfAndTest('attachment_path_file_display_or_desc_source_content', 1).then(done, done.fail);
          });
        });
      });

      describe('when given using content', () => {
        beforeEach(() => {
          spec.pdfToolsData = [
            {
              type: 'attachment',
              content: spec.imageFiles.image1
            },
            {
              type: 'attachment',
              content: spec.imageFiles.image2
            }
          ];
        });

        describe('when NOT given a fileDisplay', () => {
          beforeEach(() => {
            // Because without a fileDisplay we can't tell what name to give the file
            // TODO add attachment with name like "unnamed attachment"
            spec.expectedAttachments = [];
          });

          it('should NOT add any attachment when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');
            modifyPdfAndTest('attachment_content_no_file_display_source_path', 1).then(done, done.fail);
          });

          it('should NOT add any attachment when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
            modifyPdfAndTest('attachment_content_no_file_display_source_content', 1).then(done, done.fail);
          });
        });

        describe('when given a fileDisplay', () => {
          beforeEach(() => {
            spec.pdfToolsData[0].fileDisplay = 'mock display name 1.png';
            spec.pdfToolsData[1].fileDisplay = 'mock display name 2.png';

            spec.expectedAttachments[0].filename = 'mock display name 1.png';
            spec.expectedAttachments[1].filename = 'mock display name 2.png';
          });

          it('should add attachments when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');
            modifyPdfAndTest('attachment_content_and_file_display_source_path', 1).then(done, done.fail);
          });

          it('should add attachments when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
            modifyPdfAndTest('attachment_content_and_file_display_source_content', 1).then(done, done.fail);
          });
        });

        describe('when given fileDisplay and desc', () => {
          beforeEach(() => {
            spec.expectedAttachments[0].filename = 'mock display name 1.png';
            spec.expectedAttachments[1].filename = 'mock display name 2.png';

            spec.expectedAttachments[0].desc = 'mock description 1';
            spec.expectedAttachments[1].desc = 'mock description 2';

            spec.pdfToolsData[0].fileDisplay = 'mock display name 1.png';
            spec.pdfToolsData[1].fileDisplay = 'mock display name 2.png';

            spec.pdfToolsData[0].desc = 'mock description 1';
            spec.pdfToolsData[1].desc = 'mock description 2';
          });

          it('should add attachments when using sourcePath', (done) => {
            spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');
            modifyPdfAndTest('attachment_content_and_file_display_and_desc_source_path', 1).then(done, done.fail);
          });

          it('should add attachments when using sourceContent', (done) => {
            spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
            modifyPdfAndTest('attachment_content_and_file_display_and_desc_source_content', 1).then(done, done.fail);
          });
        })
      });
    });

    describe('font', () => {
      beforeEach(() => {
        spec.pdfToolsData = [
          { type: 'text', key:'field1', value: 'אחת שתיים ששלוש' },
          { type: 'text', key:'field2', value: 'אחת שתיים שלוש One Two Three' }
        ];
        spec.pdfToolsOpts.sourceContent = spec.sourceFiles.text;
      });

      it('should load and use font when given as a path', (done) => {
        // font downloaded from http://www.cunliffethompson.com/font/download.html
        spec.pdfToolsOpts.font = specUtil.getAssetPath('shuneet_03_book_v21.OTF');
        modifyPdfAndTest('font_path_source_content', 1).then(done, done.fail);
      });

      it('should load arialuni.ttf embedded in JAR and use it when given "arialuni.ttf"', (done) => {
        spec.pdfToolsOpts.font = 'arialuni.ttf';
        modifyPdfAndTest('font_arialuni_source_content', 1).then(done, done.fail);
      });

      it('should ignore Hebrew characters when NOT using a font', (done) => {
        modifyPdfAndTest('no_font_source_content', 1).then(done, done.fail);
      });
    });

    describe('watermarks', () => {
      beforeEach(() => {
        spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
        spec.pdfToolsOpts.watermark = {
          text: 'אחת שתיים שלוש One Two Three'
        };
      });

      it('should ignore Hebrew characters when not using a font', (done) => {
        modifyPdfAndTest('watermark_no_font', 1).then(done, done.fail);
      });

      describe('when using a font', () => {
        beforeEach(() => {
          spec.pdfToolsOpts.font = 'arialuni.ttf';
        });

        it('should show Hebrew characters', (done) => {
          modifyPdfAndTest('watermark_font', 1).then(done, done.fail);
        });

        it('should allow to set the the English part before the Hebrew part', (done) => {
          spec.pdfToolsOpts.watermark.text = 'One Two Three אחת שתיים שלוש';
          modifyPdfAndTest('watermark_english_before_hebrew', 1).then(done, done.fail);
        });

        it('should should allow to customize opacity', (done) => {
          spec.pdfToolsOpts.watermark.opacity = 75;
          modifyPdfAndTest('watermark_font_custom_opacity', 1).then(done, done.fail);
        });

        it('should should allow to customize rotation', (done) => {
          spec.pdfToolsOpts.watermark.rotation = 0;
          modifyPdfAndTest('watermark_font_custom_rotation', 1).then(done, done.fail);
        });

        it('should should allow to customize font size', (done) => {
          spec.pdfToolsOpts.watermark.fontSize = 24;
          modifyPdfAndTest('watermark_font_custom_font_size', 1).then(done, done.fail);
        });

        it('should allow to customize all', (done) => {
          spec.pdfToolsOpts.watermark.opacity = 75;
          spec.pdfToolsOpts.watermark.rotation = 0;
          spec.pdfToolsOpts.watermark.fontSize = 24;
          modifyPdfAndTest('watermark_font_custom_all', 1).then(done, done.fail);
        });
      });
    });

    describe('digital signatures', () => {
      beforeEach(() => {
        spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;
      });

      it('should NOT sign the file when cert is not given', (done) => {
        spec.expectedSignatures = [];
        modifyPdfAndTest('signature_no_signature', 1).then(() => {
          return testSignatures();
        }).then(done, done.fail);
      });

      it('should sign the file when cert is given', (done) => {
        spec.expectedSignatures = [
          {
            field_name: 'Signature1'
          }
        ];
        spec.pdfToolsOpts.cert = specUtil.getAssetPath('certificate.pfx');
        spec.pdfToolsOpts.certpass = 'password';
        spec.pdfToolsOpts.certformat = 'pkcs12';
        modifyPdfAndTest('signature_signature_1', 1).then(() => {
          return testSignatures();
        }).then(done, done.fail);
      });

      it('should use pkcs12 as default certformat', (done) => {
        spec.expectedSignatures = [
          {
            field_name: 'Signature1'
          }
        ];
        spec.pdfToolsOpts.cert = specUtil.getAssetPath('certificate.pfx');
        spec.pdfToolsOpts.certpass = 'password';
        modifyPdfAndTest('signature_signature_no_certformat', 1).then(() => {
          return testSignatures();
        }).then(done, done.fail);
      });
    });
  };

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

  it('should have created only a single log file and release it', () => {
    expect(Fs.lstatSync(spec.logFilePath).isFile()).toBe(true);
    expect(() => { Fs.lstatSync(`${spec.logFilePath}.lck`); }).toThrow();
    expect(() => { Fs.lstatSync(`${spec.logFilePath}.1`); }).toThrow();
    expect(() => { Fs.lstatSync(`${spec.logFilePath}.1.lck`); }).toThrow();
  });
});