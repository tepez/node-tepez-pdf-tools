'use strict';

const spawn = require('child_process').spawn;
const Joi = require('joi');
const _ = require('lodash');


function quote(val) {
  // escape and quote the value if it is a string and this isn't windows
  if (typeof val === 'string' && process.platform !== 'win32') {
    val = '"' + val.replace(/(["\\$`])/g, '\\$1') + '"';
  }
  return val;
}

function pdfTools(options, callback) {
  Joi.assert(callback, Joi.func());
  Joi.assert(options, Joi.object().keys({
    nailgun: Joi.bool().description('use nailgun'),
    sourcePath: Joi.string().description('path to the source file'),
    sourceContent: Joi.any().description('the content of the source file'),
    font: Joi.string(),
    cert: Joi.string(),
    certpass: Joi.string(),
    certformat: Joi.string(),
    data: Joi.string(),
    spawnOptions: Joi.object().description('options for the spawn command'),
    logFile: Joi.string(),
    logLevel: Joi.string().only('SEVERE', 'WARNING', 'INFO', 'CONFIG', 'FINE', 'FINER', 'FINEST')
  }).xor('sourcePath', 'sourceContent')
    // if certpass or certformat is given than require cert
    .with('certpass', 'cert')
    .with('certformat', 'cert')
  );

  if (typeof options.nailgun === 'undefined') {
    options.nailgun = true;
  }

  const args = [];

  // either use nailgun client or the JAR directly
  if (options.nailgun) {
    const ngPath = process.env.TP_PDF_TOOLS_NG_PATH ? quote(process.env.TP_PDF_TOOLS_NG_PATH) : 'ng';
    args.push(ngPath, 'pdfTools.Main');

  } else {
    const jarPath = process.env.TP_PDF_TOOLS_JAR_PATH ? quote(process.env.TP_PDF_TOOLS_JAR_PATH) : 'tepez-pdf-tools.jar';
    args.push('java', '-jar', jarPath);
  }

  args.push('--destination', '-');

  [ 'font', 'cert', 'certpass', 'certformat', 'data', 'logFile', 'logLevel' ].forEach((key) => {
    const val = options[key];
    if (val) {
      args.push('--' + _.kebabCase(key));
      args.push(quote(val));
    }
  });

  args.push('--source');
  if (options.sourceContent) {
    args.push('-')
  } else {
    args.push(quote(options.sourcePath));
  }

  let child;
  if (process.platform === 'win32') {
    child = spawn(args[0], args.slice(1), options.spawnOptions);
  } else {
    // this nasty business prevents piping problems on linux
    child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat'], options.spawnOptions);
  }

  // call the callback with null error when the process exits successfully
  if (callback) {
    child.on('exit', () => { callback(null); });
  }

  // setup error handling
  const stream = child.stdout;
  function handleError(err) {
    child.removeAllListeners('exit');
    child.kill();
    
    // call the callback if there is one
    if (callback) {
      callback(err);
    }

    // if not, or there are listeners for errors, emit the error event
    if (!callback || stream.listeners('error').length > 0) {
      stream.emit('error', err);
    }
  }
  
  child.once('error', handleError);
  child.stderr.once('data', (err) => {
    handleError(new Error((err || '').toString().trim()));
  });
  
  // write the content to stdin
  if (options.sourceContent) {
    child.stdin.end(options.sourceContent);
  }
  
  // return stdout stream so we can pipe
  return stream;
}

module.exports = pdfTools;
