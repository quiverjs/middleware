
'use strict'

var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

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
      handlerBuilder = createMiddlewareManagedHandlerBuilder(middlewares[middlewareCount-i-1], handlerBuilder)
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

module.exports = {
  emptyMiddleware: emptyMiddleware,
  safeCallbackMiddleware: safeCallbackMiddleware,
  createMiddlewareManagedHandlerBuilder: createMiddlewareManagedHandlerBuilder,
  combineMiddlewares: combineMiddlewares,
  safeCombineMiddlewares: safeCombineMiddlewares,
  createMiddlewareFromFilter: createMiddlewareFromFilter
}