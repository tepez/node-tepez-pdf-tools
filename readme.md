node-tepez-pdf-tools
================

A Node.js wrapper for the [tepez-pdf-tools](https://github.com/tepez/tepez-pdf-tools) command line tool.  

## Usage

To use with nailgun:
The nailgun server be running.
If `ng` (the nailgun client) is not on PATH, then `TP_PDF_TOOLS_NG_PATH` must point to it.

To use without nailgun:
If `tepez-pdf-tools.jar` is not on working directory, then `TP_PDF_TOOLS_JAR_PATH` must point to it.


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

```

Borrows a-lot from [node-wkhtmltopdf](https://github.com/devongovett/node-wkhtmltopdf)


