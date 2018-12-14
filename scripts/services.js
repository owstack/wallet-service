#!/usr/bin/env node

'use strict';

var fs = require('fs-extra');

var services = [{
  coin: 'Bitcoin Cash',
  lib: '@owstack/bch-lib',
  dir: 'bch-service'
}, {
  coin: 'Bitcoin',
  lib: '@owstack/btc-lib',
  dir: 'btc-service'
}, {
  coin: 'Litecoin',
  lib: '@owstack/ltc-lib',
  dir: 'ltc-service'
}];

var cmd = process.argv[2];
switch (cmd) {
  case 'create': createServices(); break;
  case 'clean': cleanServices(); break;
  default: help();
};

function help() {
  console.log('usage: services [create | clean]');
};

function createServices() {
  console.log('Creating service libraries...');
  services.forEach(function(s) {
    var d = __dirname + '/../' + s.dir;
    copyDir(__dirname + '/../service-template', d);

    var content = '\'use strict\'; var cLib = require(\'' + s.lib + '\'); module.exports = cLib;';
    fs.writeFileSync(s.dir + '/cLib.js', content, 'utf8');

    console.log(' > ' + s.coin + ' (' + s.lib + ') at ./' + s.dir);
  });
};

function cleanServices() {
  console.log('Deleting service libraries...');
  var count = 0;
  services.forEach(function(s) {
    var d = __dirname + '/../' + s.dir;
    if (fs.existsSync(d)) {
      fs.removeSync(d);
      count++;
      console.log(' > ' + s.coin + ' from ./' + s.dir);
    }
  });

  if (count == 0) {
    console.log(' > nothing to do');
  }
};

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }
  if (fs.existsSync(to)) {
    fs.removeSync(to);
  }
  fs.copySync(from, to);
};
