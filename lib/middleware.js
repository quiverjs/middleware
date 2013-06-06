
'use strict'

var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

// handlerFactory(config, callback) -> handler
// filter(config, handler, callback) -> filteredHandler
// middleware(config, handlerFactory, callback) -> filteredHandler

var passthroughMiddleware = function(config, handlerFactory, callback) {
  handlerFactory(config, callback)
}

var cyclicDependencyPreventionMiddleware = function(config, handlerFactory, callback) {
  callback(error(500, 'cyclic dependency of middleware\'s dependencies depending on itself'))
}

var noopFilter = function(config, handler, callback) {
  callback(null, handler)
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

var createMiddlewareManagedHandlerFactory = function(middleware, handlerFactory) {
  var managedHandlerFactory = function(config, callback) {
    middleware(config, handlerFactory, callback)
  }

  return managedHandlerFactory
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

  var middleware = function(config, handlerFactory, callback) {
    setMiddleware(config, cyclicDependencyPreventionMiddleware)

    var filteredHandlerFactory = function(config, callback) {
      if(allowRepeat) {
        setMiddleware(config, middleware)
      } else {
        setMiddleware(config, passthroughMiddleware)
      }

      handlerFactory(config, function(err, handler) {
        if(err) return callback(err)

        filter(config, handler, callback)
      })
    }

    var loadMiddlewareDependencies = function(dependencies, config, handlerFactory, callback) {
      if(dependencies.length == 0) return handlerFactory(config, callback)

      var currentDependency = dependencies[0]
      var restDependencies = dependencies.slice(1)

      if(typeof(currentDependency) == 'string') {
        currentDependency = { middlewareName: currentDependency }
      }
      var dependencyName = currentDependency.middlewareName

      var innerHandlerFactory = function(config, callback) {
        loadMiddlewareDependencies(restDependencies, config, handlerFactory, callback)
      }

      var middlewares = config[middlewareKey] || { }
      var middleware = middlewares[dependencyName]

      if(middleware) {
        middleware(config, innerHandlerFactory, callback)

      } else if(currentDependency.defaultMiddleware) {
        currentDependency.defaultMiddleware(config, innerHandlerFactory, callback)
      
      } else {
        callback(error(500, 'missing middleware dependency ' + dependencyName))
      }
    }

    loadMiddlewareDependencies(dependencies, config, filteredHandlerFactory, callback)
  }

  return middleware
}

var createDependencyManagedHandlerFactory = function(dependencies, handlerFactory) {
  var middleware = createMiddleware({
    dependencies: dependencies
  })

  return createMiddlewareManagedHandlerFactory(middleware, handlerFactory)
}

module.exports = {
  createMiddleware: createMiddleware,
  createDependencyManagedHandlerFactory: createDependencyManagedHandlerFactory,
  createFilteredHandlerFactory: createFilteredHandlerFactory,
  composeFilters: composeFilters
}
