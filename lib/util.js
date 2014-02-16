
'use strict'

var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var handleableLib = require('quiver-handleable')
var safeCallbackLib = require('quiver-safe-callback')

var safeCallback = safeCallbackLib.safeCallback
var safeAsyncFunction = safeCallbackLib.safeAsyncFunction

var emptyMiddleware = function(config, handlerBuilder, callback) {
  handlerBuilder(config, callback)
}

var safeCallbackMiddleware = function(config, handlerBuilder, callback) {
  callback = safeCallback(callback)

  setImmediate(function() {
    handlerBuilder(config, callback)
  })
}

var createMiddlewareManagedHandlerBuilder = function(middleware, handlerBuilder) {
  var managedHandlerBuilder = function(config, callback) {
    middleware(config, handlerBuilder, callback)
  }

  return managedHandlerBuilder
}

var combineMiddlewares = function(middlewares) {
  var middlewareCount = middlewares.length
  if(middlewareCount == 1) return middlewares[0]

  var combinedMiddleware = function(config, handlerBuilder, callback) {
    for(var i=0; i<middlewareCount; i++) {
      handlerBuilder = createMiddlewareManagedHandlerBuilder(
        middlewares[middlewareCount-i-1], handlerBuilder)
    }

    handlerBuilder(config, callback)
  }

  return combinedMiddleware
}

var safeCombineMiddlewares = function(middlewares) {
  var safeMiddlewares = [safeCallbackMiddleware]

  middlewares.forEach(function(middleware) {
    safeMiddlewares.push(middleware)
    safeMiddlewares.push(safeCallbackMiddleware)
  })

  return combineMiddlewares(safeMiddlewares)
}

var createMiddlewareFromFilter = function(filter) {
  var middleware = function(config, handlerBuilder, callback) {
    callback = safeCallback(callback)
    
    var filterConfig = copyObject(config)

    handlerBuilder(config, function(err, handler) {
      if(err) return callback(err)

      filter(filterConfig, handler, callback)
    })
  }

  return middleware
}

var createHandleableMiddlewareFromFilter = function(filter, handlerConvert) {
  var handleableMiddleware = function(config, handleableBuilder, callback) {
    handleableBuilder(config, function(err, handleable) {
      if(err) return callback(err)

      var handler = handlerConvert.handleableToHandler(handleable)
      if(!handler) return callback(error(400, 
        'mismatch handler type with middleware'))

      filter(config, handler, function(err, filteredHandler) {
        if(err) return callback(err)

        var filteredHandleable = handlerConvert.handlerToHandleable(filteredHandler)
        var newHandleable = handleableLib.extendHandleable(handleable, filteredHandleable)

        callback(null, newHandleable)
      })
    })
  }

  return handleableMiddleware
}

var createOptionalMiddleware = function(middleware) {
  var optionalMiddleware = function(config, handlerBuilder, callback) {
    var passed = false

    var innerHandlerBuilder = function(config, callback) {
      passed = true

      handlerBuilder(config, callback)
    }

    middleware(config, innerHandlerBuilder, function(err, handler) {
      if(!err) return callback(null, handler)
      if(passed) return callback(err)

      handlerBuilder(config, callback)
    })
  }

  return optionalMiddleware
}

var handlerConfigKeys = [
  'quiverHandleables',
  'quiverStreamHandlers',
  'quiverHttpHandlers',
  'quiverSimpleHandlers'
]

var createRemoveHandlerInstanceMiddleware = function(handlerName) {
  var middleware = function(config, handlerBuilder, callback) {
    handlerConfigKeys.forEach(function(key) {
      var handlerTable = config[key]
      if(!handlerTable) return

      if(handlerTable[handlerName]) handlerTable[handlerName] = null
    })

    handlerBuilder(config, callback)
  }

  return middleware
}

module.exports = {
  handlerConfigKeys: handlerConfigKeys,
  emptyMiddleware: emptyMiddleware,
  safeCallbackMiddleware: safeCallbackMiddleware,
  createMiddlewareManagedHandlerBuilder: createMiddlewareManagedHandlerBuilder,
  combineMiddlewares: combineMiddlewares,
  safeCombineMiddlewares: safeCombineMiddlewares,
  createMiddlewareFromFilter: createMiddlewareFromFilter,
  createHandleableMiddlewareFromFilter: createHandleableMiddlewareFromFilter,
  createOptionalMiddleware: createOptionalMiddleware,
  createRemoveHandlerInstanceMiddleware: createRemoveHandlerInstanceMiddleware
}