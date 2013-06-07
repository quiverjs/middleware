
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

var metaMiddleware = function(middlewareKey) {
  var createMiddleware = function(options) {
    var filter = options.filter || noopFilter
    var middlewareName = options.name
    var allowRepeat = options.allowRepeat
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

        handlerBuilder(copyObject(config), function(err, handler) {
          if(err) return callback(err)

          filter(copyObject(config), handler, callback)
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

  return createMiddleware
}

var createStreamMiddleware = metaMiddleware('stream-middlewares')
var createHttpMiddleware = metaMiddleware('http-middlewares')

var createMiddlewareManagedBuilder = function(middleware, handlerBuilder) {
  return function(config, callback) {
    middleware(config, handlerBuilder, callback)
  }
}

var createDependencyManagedStreamHandlerBuilder = function(dependencies, handlerBuilder) {
  var middleware = createStreamMiddleware({
    dependencies: dependencies
  })

  return createMiddlewareManagedBuilder(middleware, handlerBuilder)
}

module.exports = {
  createStreamMiddleware: createStreamMiddleware,
  createHttpMiddleware: createHttpMiddleware,
  createMiddlewareManagedBuilder: createMiddlewareManagedBuilder,
  createDependencyManagedStreamHandlerBuilder: createDependencyManagedStreamHandlerBuilder
}
