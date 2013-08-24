
'use strict'

var should = require('should')
var middleware = require('../lib/middleware')
var streamChannel = require('quiver-stream-channel')
var streamConvert = require('quiver-stream-convert')

describe('middleware test 1', function() {
  var filter1 = function(config, handler, callback) {
    var filteredHandler = function(args, inputStreamable, callback) {
      should.not.exist(args.first)
      args.first = 'first filter'

      handler(args, inputStreamable, callback)
    }

    callback(null, filteredHandler)
  }

  var filter2 = function(config, handler, callback) {
    var filteredHandler = function(args, inputStreamable, callback) {
      should.exist(args.first)
      args.first.should.equal('first filter')

      should.not.exist(args.second)
      args.second = 'second filter'

      handler(args, inputStreamable, callback)
    }

    callback(null, filteredHandler)
  }

  var middleware1 = middleware.createMiddlewareFromFilter(filter1)
  
  var middleware2 = middleware.createMiddlewareFromFilter(filter2)
  middleware2 = middleware.createMiddlewareManagedMiddleware(
    middleware2, [middleware1])

  it('simple dependencies', function(callback) {
    var handlerBuilder = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        should.exist(args.first)
        args.first.should.equal('first filter')

        should.exist(args.second)
        args.second.should.equal('second filter')

        callback(null, streamChannel.createEmptyStreamable())
      }

      callback(null, handler)
    }

    handlerBuilder = 
      middleware.createMiddlewareManagedHandlerBuilder(handlerBuilder, [middleware2])

    handlerBuilder({}, function(err, handler) {
      if(err) throw err

      handler({}, streamChannel.createEmptyStreamable(), callback)
    })
  })
})