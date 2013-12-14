
'use strict'

var should = require('should')
var middlewareLib = require('../lib/lib')
var handleable = require('quiver-handleable')
var streamChannel = require('quiver-stream-channel')
var streamConvert = require('quiver-stream-convert')

var echoHandler = function(args, inputStreamable, callback) {
  callback(null, inputStreamable)
}

describe('input handler test', function() {
  var testHandleableBuilder = function(config, callback) {
    var handler = function(args, inputStreamable, callback) {
      streamConvert.streamableToJson(inputStreamable,
        function(err, json) {
          if(err) return callback(err)

          json.value.should.equal('hello world')

          callback(null, streamChannel.createEmptyStreamable())
        })
    }

    var handleable = {
      toStreamHandler: function() {
        return handler
      }
    }

    callback(null, handleable)
  }
  var config = {
    quiverHandleableBuilders: {
      'test handler': testHandleableBuilder
    }
  }

  it('handleable test', function(callback) {
    var handlerBuilder = function(config, callback) {
      var handleable = config.quiverHandleables['test handler']
      should.exists(handleable)
      var inHandler = handleable.toStreamHandler()

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      var inputStreamable = streamConvert.jsonToStreamable({ value: 'hello world' })
      inHandler({}, inputStreamable, function(err, resultStreamable) {
        if(err) return callback(err)

        callback(null, handler)
      })
    }

    var handlerMidddleware = middlewareLib.createHandleableLoadingMiddleware('test handler')
    handlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(
      handlerMidddleware, handlerBuilder)

    handlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('handler test', function(callback) {
    var handlerBuilder = function(config, callback) {
      var inHandler = config.quiverStreamHandlers['test handler']
      should.exists(inHandler)

      var inputStreamable = streamConvert.jsonToStreamable({ value: 'hello world' })
      inHandler({}, inputStreamable, function(err, resultStreamable) {
        if(err) return callback(err)

        callback(null, echoHandler)
      })
    }

    var middlewares = [ ]
    middlewares.push(middlewareLib.createHandleableLoadingMiddleware('test handler'))
    middlewares.push(middlewareLib.createHandlerLoadingMiddleware('test handler', handleable.streamHandlerConvert))

    var handlerMidddleware = middlewareLib.combineMiddlewares(middlewares)

    handlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(
      handlerMidddleware, handlerBuilder)

    handlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('simple handler test', function(callback) {
    var handlerBuilder = function(config, callback) {
      var inHandler = config.quiverSimpleHandlers['test handler']
      should.exists(inHandler)

      var inJson = { value: 'hello world' }
      inHandler({}, inJson, function(err, result) {
        if(err) return callback(err)

        should.not.exists(result)
        callback(null, echoHandler)
      })
    }

    var middlewares = [ ]

    middlewares.push(middlewareLib.createHandleableLoadingMiddleware(
      'test handler'))

    middlewares.push(middlewareLib.createHandlerLoadingMiddleware(
      'test handler', handleable.streamHandlerConvert))

    middlewares.push(middlewareLib.createSimpleHandlerLoadingMiddleware(
      'test handler', 'json', 'void'))

    var handlerMidddleware = middlewareLib.combineMiddlewares(middlewares)

    handlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(
      handlerMidddleware, handlerBuilder)

    handlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('handleable spec test', function(callback) {
    var handlerBuilder = function(config, callback) {
      var inHandler = config.quiverSimpleHandlers['test handler']
      should.exists(inHandler)

      var inJson = { value: 'hello world' }
      inHandler({}, inJson, function(err, result) {
        if(err) return callback(err)

        should.not.exists(result)
        callback(null, echoHandler)
      })
    }

    var handleableSpec = {
      handler: 'test handler',
      type: 'simple handler',
      inputType: 'json',
      outputType: 'void'
    }

    var handlerMidddleware = middlewareLib.createInputHandlerMiddlewareFromSpec(handleableSpec)

    handlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(
      handlerMidddleware, handlerBuilder)

    handlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })

  it('skip handler test', function(callback) {
    var middleware = middlewareLib.createInputHandlerMiddleware('test handler', handleable.streamHandlerConvert)
    
    var handlerBuilder = function(config, callback) {
      should.exists(config.quiverStreamHandlers['test handler'])

      callback(null, echoHandler)
    }

    handlerBuilder = middlewareLib.createMiddlewareManagedHandlerBuilder(
      middleware, handlerBuilder)

    var config = {
      quiverStreamHandlers: {
        'test handler': echoHandler
      }
    }

    handlerBuilder(config, callback)
  })
})