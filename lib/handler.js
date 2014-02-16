
'use strict'

var util = require('./util')
var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var handleable = require('quiver-handleable')
var simpleHandler = require('quiver-simple-handler')

var clearQuiverConfigKeys = [
  'quiverInstalledMiddlewares',
  'quiverInstallingMiddlewares',
  'quiverHandleables',
  'quiverStreamHandlers',
  'quiverHttpHandlers',
  'quiverSimpleHandlers'
]

var clearQuiverConfig = function(config) {
  clearQuiverConfigKeys.forEach(function(configKey) {
    config[configKey] = { }
  })
}

var createHandleableLoadingMiddleware = function(handleableName) {
  var middleware = function(config, handlerBuilder, callback) {
    if(config.quiverHandleables && config.quiverHandleables[handleableName]) {
      return handlerBuilder(config, callback)
    }

    var handleableBuildersTable = config.quiverHandleableBuilders || { }
    var handleableBuilder = handleableBuildersTable[handleableName]

    if(!handleableBuilder) return callback(error(
      404, 'handleable builder not found: ' + handleableName))

    var handleableConfig = copyObject(config)
    clearQuiverConfig(handleableConfig)

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
      404, 'handleable not found: ' + handleableName))

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

var createSkipHandlerMiddeware = function(handlerName, configKey, middleware) {
  var skipMiddleware = function(config, handlerBuilder, callback) {
    if(config[configKey] && config[configKey][handlerName]) {
      handlerBuilder(config, callback)
    } else {
      middleware(config, handlerBuilder, callback)
    }
  }

  return skipMiddleware
}

var createInputHandlerMiddleware = function(handlerName, handlerConvert) {
  var handleableMiddleware = createHandleableLoadingMiddleware(handlerName)
  var handlerMiddleware = createHandlerLoadingMiddleware(handlerName, handlerConvert)

  var middleware = util.combineMiddlewares([handleableMiddleware, handlerMiddleware])
  middleware = createSkipHandlerMiddeware(handlerName, handlerConvert.configKey, middleware)

  return middleware
}

var createInputSimpleHandlerMiddleware = function(handlerName, inputType, outputType) {
  var handlerMiddleware = createInputHandlerMiddleware(handlerName, handleable.streamHandlerConvert)
  var inputHandlerMiddleware = createSimpleHandlerLoadingMiddleware(handlerName, inputType, outputType)

  var middleware = util.combineMiddlewares([handlerMiddleware, inputHandlerMiddleware])
  middleware = createSkipHandlerMiddeware(handlerName, 'quiverSimpleHandlers', middleware)

  return middleware
}

var createInputHandlerMiddlewareFromSpec = function(handlerSpec) {
  if(typeof(handlerSpec) == 'string') {
    handlerSpec = {
      handler: handlerSpec,
      type: 'handleable'
    }
  }

  var handlerName = handlerSpec.handler
  var handlerType = handlerSpec.type
  var rebuild = handlerSpec.rebuild
  var optional = handlerSpec.optional

  if(!handlerName) throw new Error('undefined handler name')

  var middleware

  switch(handlerType) {
    case 'stream handler':
      middleware = createInputHandlerMiddleware(handlerName, handleable.streamHandlerConvert)
    break
    case 'http handler':
      middleware = createInputHandlerMiddleware(handlerName, handleable.httpHandlerConvert)
    break
    case 'handleable':
      middleware = createHandleableLoadingMiddleware(handlerName)
    break
    case 'simple handler': 
      middleware = createInputSimpleHandlerMiddleware(
        handlerName, handlerSpec.inputType, handlerSpec.outputType)
    break
    default:
      throw new Error('invalid handler type ' + handlerType)
  }

  if(rebuild) {
    var rebuildMiddleware = util.createRemoveHandlerInstanceMiddleware(handlerName)
    middleware = util.combineMiddlewares([rebuildMiddleware, middleware])
  }

  if(optional) {
    middleware = util.createOptionalHandlerMiddleware(middleware)
  }

  return middleware
}

module.exports = {
  createHandleableLoadingMiddleware: createHandleableLoadingMiddleware,
  createHandlerLoadingMiddleware: createHandlerLoadingMiddleware,
  createSimpleHandlerLoadingMiddleware: createSimpleHandlerLoadingMiddleware,
  createInputHandlerMiddleware: createInputHandlerMiddleware,
  createInputSimpleHandlerMiddleware: createInputSimpleHandlerMiddleware,
  createInputHandlerMiddlewareFromSpec: createInputHandlerMiddlewareFromSpec
}