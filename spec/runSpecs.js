'use strict';
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');


const jasmine = new Jasmine();
jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.addReporter(new JasmineSpecReporter({

}));
jasmine.execute();

