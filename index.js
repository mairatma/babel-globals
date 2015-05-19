'use strict';

var babel = require('babel-core');
var babelDeps = require('babel-deps');
var BabelGlobalsFormatter = require('babel-globals-module-formatter');
var Concat = require('concat-with-sourcemaps');

function addUsedHelpers(concat, results) {
	var usedHelpers = getUsedExternalHelpers(results);
	concat.add('helpers.js', babel.buildExternalHelpers(usedHelpers));
}

function compileToGlobals(files, options) {
	dependencies = {};
	visited = {};

	options = normalizeOptions(options);
	var results = babelDeps(files, options.babelOptions);
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
		concat.add('init.js', 'this.' + options.babelOptions._globalName + ' = {};');
		concat.add('initNamed.js', 'this.' + options.babelOptions._globalName + 'Named = {};');
	}
}

function normalizeOptions(options) {
	options = options || {};
	options.babelOptions = options.babelOptions || {};
	options.babelOptions.externalHelpers = true;
	options.babelOptions.metadataUsedHelpers = true;
	if (options.babelOptions.resolveModuleSource) {
		var originalFn = options.babelOptions.resolveModuleSource;
		options.babelOptions.resolveModuleSource = function(source, filename) {
			return resolveModuleSource(originalFn(source, filename), filename);
		};
	} else {
		options.babelOptions.resolveModuleSource = resolveModuleSource;
	}
	options.babelOptions.modules = BabelGlobalsFormatter;
	options.babelOptions._globalName = options.globalName || 'myGlobals';

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
