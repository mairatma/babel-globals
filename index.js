'use strict';

var babel = require('babel-core');
var babelDeps = require('babel-deps');
var babelPluginGlobals = require('babel-plugin-globals');
var Concat = require('concat-with-sourcemaps');

var globalsPluginObj = {transformer: babelPluginGlobals, position: 'after'};

function addUsedHelpers(concat, results) {
  var usedHelpers = getUsedExternalHelpers(results);
  concat.add('helpers.js', babel.buildExternalHelpers(usedHelpers));
}

function compileToGlobals(files, options) {
  dependencies = {};
  visited = {};

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
    var globalAccess = 'this.' + options.babel._globalName;
    concat.add('init.js', globalAccess + ' = ' + globalAccess + ' || {};');
    concat.add('initNamed.js', globalAccess + 'Named = ' + globalAccess + 'Named || {};');
  }
}

function normalizeOptions(options) {
  options = options || {};
  options.babel = options.babel || {};
  options.babel.externalHelpers = true;
  if (options.babel.resolveModuleSource) {
    var originalFn = options.babel.resolveModuleSource;
    options.babel.resolveModuleSource = function(source, filename) {
      return resolveModuleSource(originalFn(source, filename), filename);
    };
  } else {
    options.babel.resolveModuleSource = resolveModuleSource;
  }
  options.babel.blacklist = ['es6.modules'].concat(options.babel.blacklist || []);
  options.babel.plugins = [globalsPluginObj].concat(options.babel.plugins || []);
  options.babel._globalName = options.globalName || 'myGlobals';

  options.bundleFileName = options.bundleFileName || 'bundle.js';
  return options;
}

var dependencies = {};
var visited = {};
function resolveModuleSource(source, filename) {
  dependencies[filename] = dependencies[filename] || [];
  dependencies[filename].push(babelDeps.getFullPath(source, filename));
  return source;
}

function sortModules(results) {
  var orderedResultPaths = [];
  var pathToResults = {};
  for (var i = 0; i < results.length; i++) {
    pathToResults[results[i].path] = results[i];
    visit(results[i].path, orderedResultPaths);
  }

  var orderedResults = [];
  for (var j = 0; j < orderedResultPaths.length; j++) {
    orderedResults.push(pathToResults[orderedResultPaths[j]]);
  }
  return orderedResults;
}

function visit(filePath, orderedArr) {
  if (visited[filePath]) {
    return;
  }
  visited[filePath] = true;

  var deps = dependencies[filePath] || [];
  deps.forEach(function(dep) {
    visit(dep, orderedArr);
  });
  orderedArr.push(filePath);
}

module.exports = compileToGlobals;
