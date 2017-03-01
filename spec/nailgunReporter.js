'use strict';
const Child_process = require('child_process');
const Chalk = require('chalk');
const Config = require('./config');


class NailgunReporter {
    jasmineStarted() {
        this._ngServer = Child_process.spawn('java', ['-jar', Config.ngServerJarPath]);
        this._ngServer.stdout.on('data', (data) => {
            console.log(Chalk.gray(`ng stdout: ${data}`));
        });
        this._ngServer.stderr.on('data', (data) => {
            console.log(Chalk.red(`ng stderr: ${data}`));
        });
    }

    jasmineDone() {
        console.log('Sending SIGINT to nailgun');
        this._ngServer.kill('SIGINT');

        this._ngServer.on('close', (code) => {
            console.log(`nailgun server exited with code ${code}`);
            setTimeout(() => {
                process.exit('Exiting...');
            }, 0)
        });
    }
}

module.exports = NailgunReporter;