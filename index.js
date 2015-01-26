var spawn = require('child_process').spawn,
  Joi = require('joi');

function quote(val) {
  // escape and quote the value if it is a string and this isn't windows
  if (typeof val === 'string' && process.platform !== 'win32')
    val = '"' + val.replace(/(["\\$`])/g, '\\$1') + '"';
    
  return val;
}

function pdfTools(options, callback) {

  Joi.assert(callback, Joi.func());
  Joi.assert(options, Joi.object().keys({
      sourcePath: Joi.string().description('path to the source file'),
      sourceContent: Joi.any().description('the content of the source file'),
      destinationPath: Joi.string().description('path to the destination file'),
      font: Joi.string(),
      cert: Joi.string(),
      certpass: Joi.string(),
      certformat: Joi.string(),
      data: Joi.string(),
      spawnOptions: Joi.object().description('options for the spawn command')
  })

    .xor('sourcePath', 'sourceContent')

    // if certpass or certformat is given than require cert
    .with('certpass', 'cert')
    .with('certformat', 'cert')

  );

  var jarPath = process.env.TP_PDF_TOOLS_JAR || 'tepez-pdf-tools.jar';

  //var args = ['java', '-jar', quote(jarPath), '--quite', '--destination', '-'];

  var args = ['ng', 'Main', '--quite', '--destination', '-'];

  [ 'font', 'cert', 'certpass', 'certformat', 'data' ].forEach(function(key) {
    var val = options[key];
    if (val) {
      args.push('--' + key);
      args.push(quote(val));
    }
  });

  args.push('--source');
  if (options.sourceContent) {
    args.push('-')
  } else {
    args.push(quote(options.sourcePath));
  }

//  console.log(args);

  var child;
  if (process.platform === 'win32') {
    child = spawn(args[0], args.slice(1), options.spawnOptions);
  } else {
    // this nasty business prevents piping problems on linux
    child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat'], options.spawnOptions);
  }

  // call the callback with null error when the process exits successfully
  if (callback)
    child.on('exit', function() { callback(null); });
    
  // setup error handling
  var stream = child.stdout;
  function handleError(err) {
    child.removeAllListeners('exit');
    child.kill();
    
    // call the callback if there is one
    if (callback)
      callback(err);
      
    // if not, or there are listeners for errors, emit the error event
    if (!callback || stream.listeners('error').length > 0)
      stream.emit('error', err);
  }
  
  child.once('error', handleError);
  child.stderr.once('data', function(err) {
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
