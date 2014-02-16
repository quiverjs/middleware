
'use strict'

var should = require('should')
var middlewareLib = require('../lib/lib')
var handleableLib = require('quiver-handleable')

describe('middleware test', function() {
  var handlerBuilder = function(config, callback) {
    should.exists(config.middleware1Loaded)
    should.exists(config.middleware2Loaded)

    var handler = function(args, inputStreamable, callback) {
      callback(null, inputStreamable)
    }

    callback(null, handler)
  }

  var middleware1 = function(config, handlerBuilder, callback) {
    should.not.exists(config.middleware1Loaded)
    config.middleware1Loaded = true
    handlerBuilder(config, callback)
  }

  var middleware2 = function(config, handlerBuilder, callback) {
    should.exists(config.middleware1Loaded)
    should.not.exists(config.middleware2Loaded)

    config.middleware2Loaded = true
    handlerBuilder(config, callback)
  }

  it('dependency loading test', function(callback) {
    var middleware1Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware1')
    var middleware2Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware2')

    var managedMiddleware2 = middlewareLib.combineMiddlewares([middleware1Loader, middleware2])
    var managedHandlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(middleware2Loader, handlerBuilder)

    var config = {
      quiverMiddlewares: {
        middleware1: middleware1,
        middleware2: managedMiddleware2
      }
    }

    managedHandlerBuilder(config, function(err, handler) {
      if(err) return callback(err)

      should.exists(handler)
      callback()
    })
  })

  it('cyclic dependency prevention test', function(callback) {
    var middleware1Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware1')
    var middleware2Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware2')

    var managedMiddleware1 = middlewareLib.combineMiddlewares([middleware2Loader, middleware1])
    var managedMiddleware2 = middlewareLib.combineMiddlewares([middleware1Loader, middleware2])

    managedMiddleware1 = middlewareLib.createCyclicPreventionMiddleware('middleware1', managedMiddleware1)
    managedMiddleware2 = middlewareLib.createCyclicPreventionMiddleware('middleware2', managedMiddleware2)

    var managedHandlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(middleware2Loader, handlerBuilder)

    var config = {
      quiverMiddlewares: {
        middleware1: managedMiddleware1,
        middleware2: managedMiddleware2
      }
    }

    managedHandlerBuilder(config, function(err, handler) {
      should.exists(err)

      callback()
    })
  })

  it('install once middleware test', function(callback) {
    var middleware1Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware1')
    var middleware2Loader = middlewareLib.createMiddlewareLoadingMiddleware('middleware2')

    var managedMiddleware1 = middlewareLib.createInstallOnceMiddleware('middleware1', middleware1)
    var managedMiddleware2 = middlewareLib.createInstallOnceMiddleware('middleware2', managedMiddleware2)

    managedMiddleware2 = middlewareLib.combineMiddlewares([middleware1Loader, middleware2])

    var handlerMiddleware = middlewareLib.combineMiddlewares([middleware1Loader, middleware2Loader])
    var managedHandlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(handlerMiddleware, handlerBuilder)

    var config = {
      quiverMiddlewares: {
        middleware1: managedMiddleware1,
        middleware2: managedMiddleware2
      }
    }

    managedHandlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('extend handleable test', function(callback) {
    var handler = function(args, inputStreamable, callback) {
      callback(null, inputStreamable)
    }

    var handleable = {
      toStreamHandler: function() {
        return handler
      },
      extendedFeature: function() {
        return true
      }
    }
    
    handleableLib.makeExtensible(handleable.extendedFeature)

    var handleableBuilder = function(config, callback) {
      callback(null, handleable)
    }

    var filter = function(config, handler, callback) {
      callback(null, handler)
    }

    var streamMiddleware = middlewareLib.createMiddlewareFromFilter(filter)
    var handleableMiddleware = middlewareLib.middlewareToHandleableMiddleware(
      handleableLib.streamHandlerConvert, streamMiddleware)

    handleableMiddleware({}, handleableBuilder, function(err, handleable) {
      if(err) return callback(err)
      
      should.exists(handleable.toStreamHandler)
      should.exists(handleable.extendedFeature)

      callback()
    })
  })
})