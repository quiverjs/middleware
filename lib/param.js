
'use strict'

var util = require('./util')
var error = require('quiver-error').error
var paramLib = require('quiver-param')
var mergeObjects = require('quiver-merge').mergeObjects
var handleable = require('quiver-handleable')

var createArgsParamMiddleware = function(argsParam) {
  var validator = paramLib.createParamValidator(argsParam)

  var filter = function(config, handler, callback) {
    var filteredHandler = function(args, inputStreamable, callback) {
      var err = validator(args)
      if(err) return callback(err)

      handler(args, inputStreamable, callback)
    }

    callback(null, filteredHandler)
  }

  return util.createHandleableMiddlewareFromFilter(filter, handleable.streamHandlerConvert)
}

var createConfigParamMiddleware = function(configParam) {
  var validator = paramLib.createParamValidator(configParam)

  var middleware = function(config, handlerBuilder, callback) {
    var err = validator(config)

    if(err) return callback(err)

    handlerBuilder(config, callback)
  }

  return middleware
}

var createConfigOverrideMiddleware = function(configOverride) {
  var middleware = function(config, handlerBuilder, callback) {
    var newConfig = mergeObjects([config, configOverride])

    handlerBuilder(newConfig, callback)
  }

  return middleware
}

var createConfigAliasMiddleware = function(configAliases) {
  var aliasKeys = Object.keys(configAliases)

  var middleware = function(config, handlerBuilder, callback) {
    aliasKeys.forEach(function(aliasKey) {
      config[aliasKey] = config[configAliases[aliasKey]]
    })

    handlerBuilder(config, callback)
  }

  return middleware
}

var aliasHandlerConfigKeys = [
  'quiverHandleableBuilders',
  'quiverHandleables',
  'quiverStreamHandlers',
  'quiverHttpHandlers',
  'quiverSimpleHandlers'
]

var makeHandlerAlias = function(config, sourceName, targetName) {
  aliasHandlerConfigKeys.forEach(function(configKey) {
    var handlerTable = config[configKey]
    if(!handlerTable) return

    if(handlerTable[sourceName]) {
      handlerTable[targetName] = handlerTable[sourceName]
    } else if(handlerTable[targetName]) {
      handlerTable[targetName] = null
    }
  })
}

var createHandlerAliasMiddleware = function(handlerAliases) {
  var middleware = function(config, handlerBuilder, callback) {
    for(var aliasKey in handlerAliases) {
      makeHandlerAlias(config, handlerAliases[aliasKey], aliasKey)
    }

    handlerBuilder(config, callback)
  }

  return middleware
}

module.exports = {
  createArgsParamMiddleware: createArgsParamMiddleware,
  createConfigParamMiddleware: createConfigParamMiddleware,
  createConfigOverrideMiddleware: createConfigOverrideMiddleware,
  createConfigAliasMiddleware: createConfigAliasMiddleware,
  createHandlerAliasMiddleware: createHandlerAliasMiddleware
}