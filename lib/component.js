
'use strict'

var createHandlerComponentErrorMiddleware = function(componentSpec) {
  var componentName = componentSpec.name
  var componentSourcePath = componentSpec.sourcePath

  var middleware = function(config, handlerBuilder, callback) {
    handlerBuilder(config, function(err, handler) {
      if(!err) return callback(handler)

      var errorMessage = 'error loading handler component ' + componentName +
        ' defined in ' + componentSourcePath

      var newErr = error(500, errorMessage, err)
      callback(newErr)
    })
  }

  return middleware
}

var createMiddlewareComponentErrorMiddleware = function(componentSpec, middleware) {
  var componentName = componentSpec.name
  var componentSourcePath = componentSpec.sourcePath

  var managedMiddleware = function(config, handlerBuilder, callback) {
    var middlewarePassed = false
    var isHandlerBuilderError = false

    var innerHandlerBuilder = function(config, callback) {
      middlewarePassed = true

      handlerBuilder(config, function(err, handler) {
        if(!err) return callback(null, handler)

        isHandlerBuilderError = true
        callback(err)
      })
    }

    middleware(config, innerHandlerBuilder, safeCallback(function(err, handler) {
      if(!err) return callback(null, handler)
      if(isHandlerBuilderError) return callback(err)

      var errorMessage = 'error loading middleware component ' + componentName +
        ' defined in ' + componentSourcePath

      var newErr = error(500, errorMessage, err)
      callback(newErr)
    }))
  }  
}

module.exports = {
  createHandlerComponentErrorMiddleware: createHandlerComponentErrorMiddleware,
  createMiddlewareComponentErrorMiddleware: createMiddlewareComponentErrorMiddleware
}