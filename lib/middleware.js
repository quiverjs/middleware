
'use strict'

var copyObject = require('quiver-copy').copyObject

var emptyMiddleware = function(config, handlerBuilder, callback) {
  handlerBuilder(config, callback)
}

var loadMiddlewares = function(config, middlewares, handlerBuilder, callback) {
  if(middlewares.length == 0) return handlerBuilder(config, callback)
  
  var middleware = middlewares[0]
  var restMiddlewares = middlewares.slice(1)

  var innerHandlerBuilder = function(config, callback) {
    loadMiddlewares(config, restMiddlewares, handlerBuilder, callback)
  }

  middleware(config, innerHandlerBuilder, callback)
}

var combineMiddlewares = function(middlewares) {
  var combinedMiddleware = function(config, handlerBuilder, callback) {
    loadMiddlewares(config, middlewares, handlerBuilder, callback)
  }

  return combinedMiddleware
}

var createMiddlewareManagedHandlerBuilder = function(handlerBuilder, middlewares) {
  var managedHandlerBuilder = function(config, callback) {
    loadMiddlewares(config, middlewares, handlerBuilder, callback)
  }

  return managedHandlerBuilder
}

var createMiddlewareManagedMiddleware = function(middleware, dependedMiddlewares) {
  return combineMiddlewares(dependedMiddlewares.concat(middleware))
}

var createMiddlewareFromFilter = function(filter) {
  var middleware = function(config, handlerBuilder, callback) {
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
  loadMiddlewares: loadMiddlewares,
  combineMiddlewares: combineMiddlewares,
  createMiddlewareManagedHandlerBuilder: createMiddlewareManagedHandlerBuilder,
  createMiddlewareManagedMiddleware: createMiddlewareManagedMiddleware,
  createMiddlewareFromFilter: createMiddlewareFromFilter
}