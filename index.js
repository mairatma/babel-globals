'use strict';

var babel = require('babel-core');
var babelDeps = require('babel-deps');
var babelPluginExternalHelpers = require('babel-plugin-external-helpers-2');
var babelPluginGlobals = require('babel-plugin-globals');
var Concat = require('concat-with-sourcemaps');

function addUsedHelpers(concat, results) {
  var usedHelpers = getUsedExternalHelpers(results);
  concat.add('helpers.js', babel.buildExternalHelpers(usedHelpers));
}

function compileToGlobals(files, options) {
  options = normalizeOptions(options);
  var results = babelDeps(files, options);
  var orderedResults = sortModules(results);

  var concat = new Concat(true, options.bundleFileName, '\n');
  initializeGlobalVar(concat, options);
  addUsedHelpers(concat, results);
  for (var i = 0; i < orderedResults.length; i++) {
    concat.add(orderedResults[i].path, orderedResults[i].babel.code, orderedResults[i].babel.map);
  }
  return concat;
}

function getUsedExternalHelpers(results) {
  var hasHelper = {};
  for (var i = 0; i < results.length; i++) {
    var currHelpers = results[i].babel.metadata.usedHelpers;
    for (var j = 0; j < currHelpers.length; j++) {
      hasHelper[currHelpers[j]] = true;
    }
  }
  return Object.keys(hasHelper);
}

function initializeGlobalVar(concat, options) {
  if (!options.skipGlobalVarInit) {
    var globalAccess = 'this.' + options.globalName;
    concat.add('init.js', globalAccess + ' = ' + globalAccess + ' || {};');
    concat.add('initNamed.js', globalAccess + 'Named = ' + globalAccess + 'Named || {};');
  }
}

function normalizeOptions(options) {
  options = options || {};

  options.globalName = options.globalName || 'myGlobals';
  options.bundleFileName = options.bundleFileName || 'bundle.js';

  options.babel = options.babel || {};
  var globalsPlugin = [babelPluginGlobals, {
    globalName: options.globalName
  }];
  options.babel.plugins = (options.babel.plugins || []).concat([globalsPlugin, babelPluginExternalHelpers]);

  return options;
}

var visited = {};
var pathToResults = {};

function sortModules(results) {
  pathToResults = {};
  for (var i = 0; i < results.length; i++) {
    pathToResults[results[i].path] = results[i];
  }

  var orderedResultPaths = [];
  visited = {};
  for (var j = 0; j < results.length; j++) {
    visit(results[j].path, orderedResultPaths);
  }

  var orderedResults = [];
  for (var k = 0; k < orderedResultPaths.length; k++) {
    orderedResults.push(pathToResults[orderedResultPaths[k]]);
  }
  return orderedResults;
}

function visit(filePath, orderedArr) {
  if (visited[filePath]) {
    return;
  }
  visited[filePath] = true;

  var deps = pathToResults[filePath].babel.metadata.modules.imports;
  deps.forEach(function(dep) {
    visit(babelDeps.getFullPath(dep.source, filePath), orderedArr);
  });
  orderedArr.push(filePath);
}

module.exports = compileToGlobals;
