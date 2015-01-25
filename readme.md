node-tepez-pdf-tools
================

A Node.js wrapper for the [tepez-pdf-tools](https://github.com/tepez/tepez-pdf-tools) command line tool.  

Borrows a-lot from [node-wkhtmltopdf](https://github.com/devongovett/node-wkhtmltopdf)

## Usage

```javascript
var PdfTools = require('tepez-pdf-tools');

// path
PdfTools({ sourcePath: "c:/in.pdf" }).pipe(fs.createWriteStream('out.pdf'));
  
// content
PdfTools({ sourceContent: "%PDF-1.5..." }).pipe(res);
  
// Optional callback
var stream = PdfTools({ sourceContent: "%PDF-1.5..." }, function(err) {
  if (err) {
    // handle error
  } else {
    // user `stream`
  }
);

`pdfTools.command` defaults to `'java -jar tepez-pdf-tools.jar'`, but it must point to the location where the JAR is.

```


