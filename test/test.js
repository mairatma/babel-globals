'use strict';

var assert = require('assert');
var babelGlobals = require('../index');
var fs = require('fs');
var path = require('path');

module.exports = {
  testBuildGlobals: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files);
    assert.ok(result);

    eval(result.content.toString()); // jshint ignore:line
    assert.ok(this.myGlobals.main);
    assert.strictEqual('foo bar', this.myGlobals.main);

    assert.ok(result.sourceMap);
    assert.strictEqual('bundle.js', JSON.parse(result.sourceMap).file);

    test.done();
  },

  testBuildGlobalsAlias: function(test) {
    var files = [getFile(path.resolve('test/assets/mainAlias.js'))];
    var result = babelGlobals(files, {
      babelOptions: {
        resolveModuleSource: function(source) {
          if (source[0] !== '.') {
            source = './' + source;
          }
          return source;
        }
      }
    });
    assert.ok(result);

    eval(result.content.toString()); // jshint ignore:line
    assert.ok(this.myGlobals.mainAlias);
    assert.strictEqual('foo bar', this.myGlobals.mainAlias);

    assert.ok(result.sourceMap);
    assert.strictEqual('bundle.js', JSON.parse(result.sourceMap).file);

    test.done();
  },

  testGlobalVariableInit: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files);
    assert.ok(result);

    var myGlobals = {};
    var myGlobalsNamed = {};
    this.myGlobals = myGlobals;
    this.myGlobalsNamed = myGlobalsNamed;
    eval(result.content.toString()); // jshint ignore:line
    assert.notStrictEqual(myGlobals, this.myGlobals);
    assert.notStrictEqual(myGlobalsNamed, this.myGlobalsNamed);

    test.done();
  },

  testSkipGlobalVariableInit: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {skipGlobalVarInit: true});
    assert.ok(result);

    var myGlobals = {};
    var myGlobalsNamed = {};
    this.myGlobals = myGlobals;
    this.myGlobalsNamed = myGlobalsNamed;
    eval(result.content.toString()); // jshint ignore:line
    assert.strictEqual(myGlobals, this.myGlobals);
    assert.strictEqual(myGlobalsNamed, this.myGlobalsNamed);

    test.done();
  },

  testBuildGlobalsWithGlobalsName: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {globalName: 'foo'});
    assert.ok(result);

    eval(result.content.toString()); // jshint ignore:line
    assert.ok(this.foo.main);
    assert.strictEqual('foo bar', this.foo.main);

    assert.ok(result.sourceMap);
    assert.strictEqual('bundle.js', JSON.parse(result.sourceMap).file);

    test.done();
  },

  testBuildGlobalsWithBundleName: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {bundleFileName: 'myGlobals.js'});
    assert.ok(result);

    eval(result.content.toString()); // jshint ignore:line
    assert.ok(this.myGlobals.main);
    assert.strictEqual('foo bar', this.myGlobals.main);

    assert.ok(result.sourceMap);
    assert.strictEqual('myGlobals.js', JSON.parse(result.sourceMap).file);

    test.done();
  }
};

var filesContents = {};
function getFile(path) {
  if (!filesContents[path]) {
    filesContents[path] = fs.readFileSync(path, 'utf8');
  }
  return {contents: filesContents[path], options: {filename: path}};
}
