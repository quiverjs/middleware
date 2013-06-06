
'use strict'

var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

// handlerBuilder(config, callback) -> handler
// filter(config, handler, callback) -> filteredHandler
// middleware(config, handlerBuilder, callback) -> filteredHandler

var passthroughMiddleware = function(config, handlerBuilder, callback) {
  handlerBuilder(config, callback)
}

var cyclicDependencyPreventionMiddleware = function(config, handlerBuilder, callback) {
  callback(error(500, 'cyclic dependency of middleware\'s dependencies depending on itself'))
}

var noopFilter = function(config, handler, callback) {
  callback(null, handler)
}

var createFilteredHandlerBuilder = function(filter, handlerBuilder) {
  var filteredHandlerBuilder = function(config, callback) {
    callback = safeCallback(callback)

    handlerBuilder(config, function(err, handler) {
      if(err) return callback(err)

      filter(config, handler, callback)
    })
  }

  return filteredHandlerBuilder
}

var createMiddlewareManagedHandlerBuilder = function(middleware, handlerBuilder) {
  var managedHandlerBuilder = function(config, callback) {
    middleware(config, handlerBuilder, callback)
  }

  return managedHandlerBuilder
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

var createMiddleware = function(options) {
  var filter = options.filter || noopFilter
  var middlewareName = options.middlewareName
  var allowRepeat = options.allowRepeat

  var middlewareType = options.middlewareType || 'stream'
  var middlewareKey = options.middlewareKey || middlewareType + '-middlewares'
  var dependencies = options.dependencies || [ ]

  var setMiddleware = function(config, middleware) {
    if(!config[middlewareKey]) config[middlewareKey] = { }
    var middlewares = config[middlewareKey]
    middlewares[middlewareName] = middleware
  }
  if(!middlewareName) setMiddleware = function(config, middleware) { }

  var middleware = function(config, handlerBuilder, callback) {
    setMiddleware(config, cyclicDependencyPreventionMiddleware)

    var filteredHandlerBuilder = function(config, callback) {
      if(allowRepeat) {
        setMiddleware(config, middleware)
      } else {
        setMiddleware(config, passthroughMiddleware)
      }

      handlerBuilder(config, function(err, handler) {
        if(err) return callback(err)

        filter(config, handler, callback)
      })
    }

    var loadMiddlewareDependencies = function(dependencies, config, handlerBuilder, callback) {
      if(dependencies.length == 0) return handlerBuilder(config, callback)

      var currentDependency = dependencies[0]
      var restDependencies = dependencies.slice(1)

      if(typeof(currentDependency) == 'string') {
        currentDependency = { middlewareName: currentDependency }
      }
      var dependencyName = currentDependency.middlewareName

      var innerHandlerBuilder = function(config, callback) {
        loadMiddlewareDependencies(restDependencies, config, handlerBuilder, callback)
      }

      var middlewares = config[middlewareKey] || { }
      var middleware = middlewares[dependencyName]

      if(middleware) {
        middleware(config, innerHandlerBuilder, callback)

      } else if(currentDependency.defaultMiddleware) {
        currentDependency.defaultMiddleware(config, innerHandlerBuilder, callback)
      
      } else {
        callback(error(500, 'missing middleware dependency ' + dependencyName))
      }
    }

    loadMiddlewareDependencies(dependencies, config, filteredHandlerBuilder, callback)
  }

  return middleware
}

var createDependencyManagedHandlerBuilder = function(dependencies, handlerBuilder) {
  var middleware = createMiddleware({
    dependencies: dependencies
  })

  return createMiddlewareManagedHandlerBuilder(middleware, handlerBuilder)
}

module.exports = {
  createMiddleware: createMiddleware,
  createDependencyManagedHandlerBuilder: createDependencyManagedHandlerBuilder,
  createFilteredHandlerBuilder: createFilteredHandlerBuilder,
  composeFilters: composeFilters
}
