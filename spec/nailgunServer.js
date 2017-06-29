'use strict';
const Child_process = require('child_process');
const Chalk = require('chalk');
const Config = require('./config');


exports = module.exports = {};

let _ngServer;

exports.startNailgun = () => {
    _ngServer = Child_process.spawn('java', ['-jar', Config.ngServerJarPath]);
    _ngServer.stdout.on('data', (data) => {
        console.log(Chalk.gray(`ng stdout: ${data}`));
    });
    _ngServer.stderr.on('data', (data) => {
        console.log(Chalk.red(`ng stderr: ${data}`));
    });
};

exports.stopNailgun = () => {
    return new Promise((resolve, reject) => {
        console.log('Sending SIGINT to nailgun');
        _ngServer.kill('SIGINT');

        _ngServer.on('close', (code) => {
            console.log(`nailgun server exited with code ${code}`);
            setTimeout(() => {
                resolve();
            }, 0)
        });
    });
};