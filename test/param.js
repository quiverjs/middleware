
'use strict'

var should = require('should')
var middleware = require('../lib/lib')
var streamChannel = require('quiver-stream-channel')

describe('param test', function() {
  var param = [
    {
      key: 'test',
      required: true,
      valueType: 'string'
    }
  ]

  var configParamMiddleware = middleware.createConfigParamMiddleware(param)

  var configTestHandlerBuilder = function(config, callback) {
    should.exists(config.test)

    var handler = function(args, inputStreamable, callback) {
      callback(null, inputStreamable)
    }

    callback(null, handler)
  }

  configTestHandlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
    configParamMiddleware, configTestHandlerBuilder)

  it('config param pass test', function(callback) {
    var config = {
      test: 'test'
    }

    configTestHandlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('config param fail test 1', function(callback) {
    var config = { }

    configTestHandlerBuilder(config, function(err, handler) {
      should.exists(err)

      callback()
    })
  })

  it('config param pass test', function(callback) {
    var config = {
      test: ['test']
    }

    configTestHandlerBuilder(config, function(err, handler) {
      should.exists(err)

      callback()
    })
  })

  var argsParamMiddleware = middleware.createArgsParamMiddleware(param)

  var argsTestHandlerBuilder = function(config, callback) {
    var handler = function(args, inputStreamable, callback) {
      should.exists(args.test)

      callback(null, inputStreamable)
    }

    callback(null, handler)
  }

  argsTestHandlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
    argsParamMiddleware, argsTestHandlerBuilder)

  it('args param pass test', function(callback) {
    var config = { }
    var args = {
      test: 'test'
    }

    argsTestHandlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      handler(args, streamChannel.createEmptyStreamable(), 
        function(err, resultStreamable) {
          should.not.exists(err)

          callback()
        })
    })
  })

  it('args param fail test 1', function(callback) {
    var config = { }
    var args = { }

    argsTestHandlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      handler(args, streamChannel.createEmptyStreamable(), 
        function(err, resultStreamable) {
          should.exists(err)

          callback()
        })
    })
  })

  it('args param fail test 1', function(callback) {
    var config = { }
    var args = {
      test: ['test']
    }

    argsTestHandlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      handler(args, streamChannel.createEmptyStreamable(), 
        function(err, resultStreamable) {
          should.exists(err)

          callback()
        })
    })
  })
})

describe('alias test', function() {
  it('config alias test', function(callback) {
    var configAlias = {
      foo: 'bar'
    }

    var handlerBuilder = function(config, callback) {
      config.foo.should.equal('bar')
      config.bar.should.equal('bar')

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      callback(null, handler)
    }

    var aliasMiddleware = middleware.createConfigAliasMiddleware(configAlias)
    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
      aliasMiddleware, handlerBuilder)

    var config = {
      bar: 'bar'
    }

    handlerBuilder(config, callback)
  })

  it('handler alias test', function(callback) {
    var handlerAlias = {
      'foo handler': 'bar handler'
    }

    var barHandlerBuilder = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      callback(null, handler)
    }

    var handlerBuilder = function(config, callback) {
      should.exists(config.quiverHandleableBuilders['foo handler'])

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      callback(null, handler)
    }

    var config = {
      quiverHandleableBuilders: {
        'bar handler': barHandlerBuilder
      }
    }

    var aliasMiddleware = middleware.createHandlerAliasMiddleware(handlerAlias)

    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
      aliasMiddleware, handlerBuilder)

    handlerBuilder(config, callback)
  })

  it('config override test', function(callback) {
    var configOverride = {
      test: 'foo'
    }

    var configMiddleware = middleware.createConfigOverrideMiddleware(configOverride)

    var handlerBuilder = function(config, callback) {
      config.test.should.equal('foo')

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      callback(null, handler)
    }

    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
      configMiddleware, handlerBuilder)

    var config = { 
      test: 'bar'
    }

    handlerBuilder(config, callback)
  })
})