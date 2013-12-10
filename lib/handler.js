
'use strict'

var util = require('./util')
var simpleHandler = require('quiver-simple-handler')
var copyObject = require('quiver-copy').copyObject
var handleable = require('quiver-handleable')

var createHandleableLoadingMiddleware = function(handleableName) {
  var middleware = function(config, handlerBuilder, callback) {
    if(config.quiverHandleables && config.quiverHandleables[handleableName]) {
      return handlerBuilder(config, callback)
    }

    var handleableBuildersTable = config.quiverHandleableBuilders || { }
    var handleableBuilder = handleableBuildersTable[handleableName]

    if(!handleableBuilder) return callback(error(
      500, 'handleable builder not found: ' + handleableName))

    var handleableConfig = copyObject(config)
    handleableConfig.quiverInstalledMiddlewares = { }
    handleableConfig.quiverInstallingMiddlewares = { }

    handleableBuilder(handleableConfig, function(err, handleable) {
      if(err) return callback(err)

      if(!config.quiverHandleables) config.quiverHandleables = { }

      config.quiverHandleables[handleableName] = handleable
      handlerBuilder(config, callback)
    })
  }

  return middleware
}

var createHandlerLoadingMiddleware = function(handleableName, handlerConvert) {
  var middleware = function(config, handlerBuilder, callback) {
    var handleablesTable = config.quiverHandleables || { }
    var handleable = handleablesTable[handleableName]

    if(!handleable) return callback(error(
      500, 'handleable not found: ' + handleableName))

    var handler = handlerConvert.handleableToHandler(handleable)

    var configKey = handlerConvert.configKey
    if(!config[configKey]) config[configKey] = { }
    var handlerTable = config[configKey]

    handlerTable[handleableName] = handler

    handlerBuilder(config, callback)
  }

  return middleware
}

var createSimpleHandlerLoadingMiddleware = function(handlerName, inputType, outputType) {
  var middleware = function(config, handlerBuilder, callback) {
    var streamHandlerTable = config.quiverStreamHandlers ||  { }
    var streamHandler = streamHandlerTable[handlerName]

    if(!streamHandler) return callback(error(404, 
      'stream handler not found: ' + handlerName))

    var handler = simpleHandler.streamHandlerToSimpleHandler(
      inputType, outputType, streamHandler)

    if(!config.quiverSimpleHandlers) config.quiverSimpleHandlers = { }

    config.quiverSimpleHandlers[handlerName] = handler
    handlerBuilder(config, callback)
  }

  return middleware
}

var createOptionalHandlerMiddleware = function(handlerName, middleware) {
  var optionalMiddleware = function(config, handlerBuilder, callback) {
    var handleableBuildersTable = config.quiverHandleableBuilders || { }
    var handleableBuilder = handleableBuildersTable[handleableName]

    if(!handleableBuilder) return handlerBuilder(config, callback)
    middleware(config, handlerBuilder, callback)
  }

  return optionalMiddleware
}

var createInputHandlerMiddlewareFromSpec = function(handlerSpec) {
  if(typeof(handlerSpec) == 'string') {
    handlerSpec = {
      name: handlerSpec,
      type: 'handleable'
    }
  }

  var handlerName = handlerSpec.name
  var handlerType = handlerSpec.type
  var optional = handlerSpec.optional

  var middlewares = []

  middlewares.push(createHandleableLoadingMiddleware(handlerName))

  if(handlerType == 'stream handler') {
    middlewares.push(createHandlerLoadingMiddleware(
      handlerName, handleable.streamHandlerConvert))

  } else if(handlerType == 'http handler') {
    middlewares.push(createHandlerLoadingMiddleware(
      handlerName, handleable.httpHandlerConvert))

  } else if(handlerType == 'simple handler') {
    middlewares.push(createHandlerLoadingMiddleware(
      handlerName, handleable.streamHandlerConvert))

    middlewares.push(createSimpleHandlerLoadingMiddleware(
      handlerName, handlerSpec.inputType, handlerSpec.outputType))
  }

  var middleware = util.combineMiddlewares(middlewares)

  if(optional) {
    middleware = createOptionalHandlerMiddleware(handlerName, middleware)
  }

  return middleware
}

module.exports = {
  createHandleableLoadingMiddleware: createHandleableLoadingMiddleware,
  createHandlerLoadingMiddleware: createHandlerLoadingMiddleware,
  createSimpleHandlerLoadingMiddleware: createSimpleHandlerLoadingMiddleware,
  createOptionalHandlerMiddleware: createOptionalHandlerMiddleware,
  createInputHandlerMiddlewareFromSpec: createInputHandlerMiddlewareFromSpec
}