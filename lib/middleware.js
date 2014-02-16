
'use strict'

var util = require('./util')
var error = require('quiver-error').error
var handleableLib = require('quiver-handleable')
var safeCallbackLib = require('quiver-safe-callback')
var safeCallback = safeCallbackLib.safeCallback
var safeAsyncFunction = safeCallbackLib.safeAsyncFunction

var createMiddlewareLoadingMiddleware = function(middlewareName) {
  var middleware = function(config, handlerBuilder, callback) {
    var middlewareTable = config.quiverMiddlewares || { }
    var loadedMiddleware = middlewareTable[middlewareName]

    if(!loadedMiddleware) return callback(
      error(500, 'middleware not found: ' + middlewareName))

    loadedMiddleware(config, handlerBuilder, callback)
  }

  return middleware
}

var createInstallOnceMiddleware = function(middlewareName, middleware) {
  var managedMiddleware = function(config, handlerBuilder, callback) {
    if(!config.quiverInstalledMiddlewares) { 
      config.quiverInstalledMiddlewares = { }
    }

    if(config.quiverInstalledMiddlewares[middlewareName]) {
      return handlerBuilder(config, callback)
    }

    config.quiverInstalledMiddlewares[middlewareName] = true
    middleware(config, handlerBuilder, callback)
  }

  return managedMiddleware
}

var createCyclicPreventionMiddleware = function(middlewareName, middleware) {
  var managedMiddleware = function(config, handlerBuilder, callback) {
    if(!config.quiverInstallingMiddlewares) {
      config.quiverInstallingMiddlewares = { }
    }
 
    if(config.quiverInstallingMiddlewares[middlewareName]) {
      return callback(error(500, 'cyclic middleware dependency error'))
    }

    config.quiverInstallingMiddlewares[middlewareName] = true

    var innerHandlerBuilder = function(config, callback) {
      config.quiverInstallingMiddlewares[middlewareName] = false

      handlerBuilder(config, callback)
    }

    middleware(config, innerHandlerBuilder, callback)
  }

  return managedMiddleware
}

var createOptionalMiddleware = function(middlewareName, middleware) {
  var managedMiddleware = function(config, handlerBuilder, callback) {
    var loadedMiddleware = middlewareTable[middlewareName]

    if(!loadedMiddleware) return handlerBuilder(config, callback)
    middleware(config, handlerBuilder, callback)
  }

  return managedMiddleware
}

var createMiddlewareFromMiddlewareSpec = function(middlewareSpec) {
  if(typeof(middlewareSpec) == 'string') {
    middlewareSpec = {
      middleware: middlewareSpec
    }
  }

  var middlewareName = middlewareSpec.middleware
  var optional = middlewareSpec.optional
  var allowRepeat = middlewareSpec.allowRepeat

  if(!middlewareName) throw new Error('undefined middleware name')

  var middleware = createMiddlewareLoadingMiddleware(middlewareName)

  if(!allowRepeat) {
    middleware = createInstallOnceMiddleware(middlewareName, middleware)
  }

  middleware = createCyclicPreventionMiddleware(middlewareName, middleware)

  if(optional) {
    middleware = createOptionalMiddleware(middlewareName, middleware)
  }

  return middleware
}

var middlewareToHandleableMiddleware = function(handlerConvert, middleware) {
  var handlerArity = handlerConvert.handlerArity || 0

  var managedMiddleware = function(config, handleableBuilder, callback) {
    var originalHandleable

    var innerHandlerBuilder = function(config, callback) {
      handleableBuilder(config, function(err, handleable) {
        if(err) return callback(err)

        originalHandleable = handleable

        var handler = handlerConvert.handleableToHandler(handleable)
        if(!handler) return callback(
          error(500, 'mismatch handler type with middleware'))

        callback(null, handler)
      })
    }

    middleware(config, innerHandlerBuilder, safeCallback(function(err, handler) {
      if(err) return callback(err)

      if(handlerArity > 0) {
        handler = safeAsyncFunction(handler, handlerArity)
      }

      var handleable = handlerConvert.handlerToHandleable(handler)

      if(originalHandleable) {
        handleable = handleableLib.extendHandleable(originalHandleable, handleable)
      }

      callback(null, handleable)
    }))
  }

  return managedMiddleware
}

module.exports = {
  createMiddlewareLoadingMiddleware: createMiddlewareLoadingMiddleware,
  createInstallOnceMiddleware: createInstallOnceMiddleware,
  createCyclicPreventionMiddleware: createCyclicPreventionMiddleware,
  createOptionalMiddleware: createOptionalMiddleware,
  createMiddlewareFromMiddlewareSpec: createMiddlewareFromMiddlewareSpec,
  middlewareToHandleableMiddleware: middlewareToHandleableMiddleware
}