
'use strict'

var should = require('should')
var middleware = require('../lib/lib')

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
    config.middleware1Loaded = true
    handlerBuilder(config, callback)
  }

  var middleware2 = function(config, handlerBuilder, callback) {
    should.exists(config.middleware1Loaded)

    config.middleware2Loaded = true
    handlerBuilder(config, callback)
  }

  it('dependency loading test', function(callback) {
    var middleware1Loader = middleware.createMiddlewareLoadingMiddleware('middleware1')
    var middleware2Loader = middleware.createMiddlewareLoadingMiddleware('middleware2')

    var managedMiddleware2 = middleware.combineMiddlewares([middleware1Loader, middleware2])
    var managedHandlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(middleware2Loader, handlerBuilder)

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
    var middleware1Loader = middleware.createMiddlewareLoadingMiddleware('middleware1')
    var middleware2Loader = middleware.createMiddlewareLoadingMiddleware('middleware2')

    var managedMiddleware1 = middleware.combineMiddlewares([middleware2Loader, middleware1])
    var managedMiddleware2 = middleware.combineMiddlewares([middleware1Loader, middleware2])

    managedMiddleware1 = middleware.createCyclicPreventionMiddleware('middleware1', managedMiddleware1)
    managedMiddleware2 = middleware.createCyclicPreventionMiddleware('middleware2', managedMiddleware2)

    var managedHandlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(middleware2Loader, handlerBuilder)

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
})