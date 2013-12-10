
'use strict'

var util = require('./util')
var paramLib = require('quiver-param')
var mergeObjects = require('quiver-merge').mergeObjects

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

  return util.createMiddlewareFromFilter(filter)
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

var createHandlerAliasMiddleware = function(handlerAliases) {
  var aliasKeys = Object.keys(handlerAliases)

  var middleware = function(config, handlerBuilder, callback) {
    if(!config.quiverHandleableBuilders) config.quiverHandleableBuilders = { }
    if(!config.quiverHandleables) config.quiverHandleables = { }

    var handleableBuilderTable = config.quiverHandleableBuilders
    var handleableTable = config.quiverHandleables

    aliasKeys.forEach(function(aliasKey) {
      handleableBuilderTable[aliasKey] = handleableBuilderTable[handlerAliases[aliasKey]]
      if(handleableTable[handlerAliases[aliasKey]]) {
        handleableTable[aliasKey] = handleableTable[handlerAliases[aliasKey]]
      }
    })

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