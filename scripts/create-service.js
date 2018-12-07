#!/usr/bin/env node

'use strict';

var fs = require('fs-extra');

var services = [{
  coin: 'Bitcoin',
  lib: '@owstack/btc-lib',
  dir: 'btc-service'
}];

services.forEach(function(s) {
  copyDir(__dirname + '/../service-template', __dirname + '/../' + s.dir);

  var content = '\'use strict\'; var cLib = require(\'' + s.lib + '\'); module.exports = cLib;';
  fs.writeFileSync(s.dir + '/cLib.js', content, 'utf8');

  console.log('Created service library for ' + s.coin + ' (' + s.lib + ') at ./' + s.dir);
});

function copyDir(from, to) {
  console.log('Copying dir ' + from + ' to ' + to);

  if (!fs.existsSync(from)) {
    return;
  }
  if (fs.existsSync(to)) {
    fs.removeSync(to);
  }

  fs.copySync(from, to);
}
