
"use strict"

var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

// handlerFactory(config, callback) -> handler
// filter(config, handler, callback) -> filteredHandler
// middleware(middlewareConfig, handlerFactory, callback) -> handler

var passthroughMiddleware = function(config, handlerFactory, callback) {
  handlerFactory(config, callback)
}

var createDependencyManagedHandlerFactory = function(dependencies, handlerFactory) {
  if(dependencies.length == 0) return handlerFactory

  var currentDependency = dependencies[0]

  var middlewareName = currentDependency.middlewareName
  if(typeof(currentDependency) == 'string') {
    middlewareName = currentDependency
    currentDependency = {
      middlewareName: middlewareName
    }
  }

  var innerHandlerFactory = createDependencyManagedHandlerFactory(
    dependencies.slice(1), handlerFactory)

  var filteredHandlerFactory = function(config, callback) {
    callback = safeCallback(callback)

    var middlewares = config.middlewares || { }
    var middleware = middlewares[middlewareName]

    if(middleware) {
      middlewares[middlewareName] = passthroughMiddleware
      middleware(config, innerHandlerFactory, callback)

    } else if(currentDependency.defaultMiddleware) {
      currentDependency.defaultMiddleware(config, innerHandlerFactory, callback)
    
    } else if(currentDependency.optional) {
      innerHandlerFactory(config, callback)
    
    } else {
      callback(error(500, 'missing middleware dependency ' + middlewareName))
    }
  }

  return filteredHandlerFactory
}

var createFilteredHandlerFactory = function(filter, handlerFactory) {
  var filteredHandlerFactory = function(config, callback) {
    callback = safeCallback(callback)

    handlerFactory(config, function(err, handler) {
      if(err) return callback(err)

      filter(config, handler, callback)
    })
  }

  return filteredHandlerFactory
}

var createMiddlewareFromFilter = function(filter, dependencies) {
  dependencies = dependencies || [ ]

  var middleware = function(config, handlerFactory, callback) {
    config.middlewares = config.middlewares || { }

    var filteredHandlerFactory = createFilteredHandlerFactory(filter, handlerFactory)
    var configuredHandlerFactory = createDependencyManagedHandlerFactory(dependencies, filteredHandlerFactory)

    configuredHandlerFactory(config, callback)
  }

  return middleware
}

var composeFilters = function(filters) {
  var currentFilter = filters[0]

  if(filters.length == 1) return currentFilter

  var innerComposedFilter = composeFilters(filters.slice(1))
  
  var composedFilter = function(config, handler, callback) {
    innerComposedFilter(config, handler, function(err, innerFilteredHandler) {
      if(err) return callback(err)

      currentFilter(config, innerFilteredHandler, callback)
    })
  }

  return composedFilter
}

module.exports = {
  createMiddlewareFromFilter: createMiddlewareFromFilter,
  createDependencyManagedHandlerFactory: createDependencyManagedHandlerFactory,
  createFilteredHandlerFactory: createFilteredHandlerFactory,
  composeFilters: composeFilters
}