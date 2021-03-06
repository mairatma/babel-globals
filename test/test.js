'use strict';

var assert = require('assert');
var babelGlobals = require('../index');
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');

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

  testBuildGlobalsWithMorePlugins: function(test) {
    var files = [getFile(path.resolve('test/assets/UsingClasses.js'))];
    var result = babelGlobals(files, {
      babel: {
        plugins: [
          'transform-es2015-classes',
          'transform-es2015-block-scoping'
        ]
      }
    });
    assert.ok(result);

    eval(result.content.toString()); // jshint ignore:line
    assert.ok(this.myGlobals.UsingClasses);
    assert.strictEqual('foo bar', this.myGlobals.UsingClasses.value());

    assert.ok(result.sourceMap);
    assert.strictEqual('bundle.js', JSON.parse(result.sourceMap).file);

    test.done();
  },

  testBuildGlobalsAlias: function(test) {
    var files = [getFile(path.resolve('test/assets/mainAlias.js'))];
    var result = babelGlobals(files, {
      babel: {
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

    var myGlobals = {a: 1};
    var myGlobalsNamed = {b: 1};
    this.myGlobals = myGlobals;
    this.myGlobalsNamed = myGlobalsNamed;
    eval(result.content.toString()); // jshint ignore:line
    assert.strictEqual(myGlobals, this.myGlobals);
    assert.strictEqual(1, myGlobals.a);
    assert.ok(myGlobals.Foo);
    assert.strictEqual(myGlobalsNamed, this.myGlobalsNamed);
    assert.strictEqual(1, myGlobalsNamed.b);
    assert.ok(myGlobalsNamed.Bar);

    test.done();
  },

  testSkipGlobalVariableInit: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {skipGlobalVarInit: true});
    assert.ok(result);

    var content = result.content.toString();
    assert.strictEqual(-1, content.indexOf('this.myGlobals ='));
    assert.strictEqual(-1, content.indexOf('this.myGlobalsNamed ='));

    test.done();
  },

  testSkipGlobalVariableInitJustNamed: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {skipGlobalVarInit: {named: true}});
    assert.ok(result);

    var content = result.content.toString();
    assert.notStrictEqual(-1, content.indexOf('this.myGlobals ='));
    assert.strictEqual(-1, content.indexOf('this.myGlobalsNamed ='));

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
  },

  testBuildGlobalsWithFalseStoreOnThis: function(test) {
    var files = [getFile(path.resolve('test/assets/main.js'))];
    var result = babelGlobals(files, {globalName: 'foo', storeOnThis: false});
    assert.ok(result);

    var content = result.content.toString();
    assert.strictEqual(-1, content.indexOf('this.foo ='));
    assert.notStrictEqual(-1, content.indexOf('foo ='));

    test.done();
  },

  testUsedHelpersBeingAdded: function(test) {
    var files = [getFile(path.resolve('test/assets/TypeOf.js'))];
    var result = babelGlobals(files, {
      babel: {
        plugins: [
          'transform-es2015-classes',
          'transform-es2015-block-scoping',
          'transform-es2015-typeof-symbol/'
        ]
      }
    });

    eval(result.content.toString()); // jshint ignore:line
    assert.strictEqual('foo bar string', this.myGlobals.TypeOf);
    assert.notStrictEqual(-1, result.content.toString().indexOf('var babelHelpers = {}'));
    test.done();
  },

  testUnfoundImportedFile: function(test) {
    sinon.stub(console, 'warn');
    assert.doesNotThrow(function() {
      babelGlobals([{
        contents: 'import Foo from "/unfound/file";',
        options: {
          filename: 'test/assets/TestUnfound.js'
        }
      }]);
    });
    assert.strictEqual(1, console.warn.callCount);
    console.warn.restore();
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
