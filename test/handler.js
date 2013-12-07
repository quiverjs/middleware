
'use strict'

var should = require('should')
var middleware = require('../lib/lib')
var handleable = require('quiver-handleable')
var streamChannel = require('quiver-stream-channel')
var streamConvert = require('quiver-stream-convert')

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

    var handlerMidddleware = middleware.createHandleableLoadingMiddleware('test handler')
    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
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

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      var inputStreamable = streamConvert.jsonToStreamable({ value: 'hello world' })
      inHandler({}, inputStreamable, function(err, resultStreamable) {
        if(err) return callback(err)

        callback(null, handler)
      })
    }

    var middlewares = [ ]
    middlewares.push(middleware.createHandleableLoadingMiddleware('test handler'))
    middlewares.push(middleware.createHandlerLoadingMiddleware('test handler', handleable.streamHandlerConvert))

    var handlerMidddleware = middleware.combineMiddlewares(middlewares)

    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
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

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      var inJson = { value: 'hello world' }
      inHandler({}, inJson, function(err, result) {
        if(err) return callback(err)

        should.not.exists(result)
        callback(null, handler)
      })
    }

    var middlewares = [ ]

    middlewares.push(middleware.createHandleableLoadingMiddleware(
      'test handler'))

    middlewares.push(middleware.createHandlerLoadingMiddleware(
      'test handler', handleable.streamHandlerConvert))

    middlewares.push(middleware.createSimpleHandlerLoadingMiddleware(
      'test handler', 'json', 'void'))

    var handlerMidddleware = middleware.combineMiddlewares(middlewares)

    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
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

      var handler = function(args, inputStreamable, callback) {
        callback(null, inputStreamable)
      }

      var inJson = { value: 'hello world' }
      inHandler({}, inJson, function(err, result) {
        if(err) return callback(err)

        should.not.exists(result)
        callback(null, handler)
      })
    }

    var handleableSpec = {
      name: 'test handler',
      type: 'simple handler',
      inputType: 'json',
      outputType: 'void'
    }

    var handlerMidddleware = middleware.createInputHandlerMiddlewareFromSpec(handleableSpec)

    handlerBuilder = middleware.createMiddlewareManagedHandlerBuilder(
      handlerMidddleware, handlerBuilder)

    handlerBuilder(config, function(err, handler) {
      should.not.exists(err)

      callback()
    })
  })
})