
"use strict"

var should = require('should')
var middleware = require('../lib/middleware')
var streamChannel = require('quiver-stream-channel')

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

  var filter3 = function(config, handler, callback) {
    var filteredHandler = function(args, inputStreamable, callback) {
      should.exist(args.first)
      args.first.should.equal('first filter')

      should.not.exist(args.third)
      args.third = 'third filter'

      handler(args, inputStreamable, callback)
    }

    callback(null, filteredHandler)
  }

  var middleware1 = middleware.createMiddlewareFromFilter(filter1)
  var middleware2 = middleware.createMiddlewareFromFilter(filter2, ['first-middleware'])
  var middleware3 = middleware.createMiddlewareFromFilter(filter3, ['first-middleware'])

  it('simple dependencies', function(callback) {
    var handlerFactory = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        should.exist(args.first)
        args.first.should.equal('first filter')

        should.exist(args.second)
        args.second.should.equal('second filter')

        callback(null, streamChannel.createEmptyStreamable())
      }

      callback(null, handler)
    }

    var config = {
      middlewares: {
        'first-middleware': middleware1
      }
    }

    middleware2(config, handlerFactory, function(err, handler) {
      if(err) throw err

      handler({}, streamChannel.createEmptyStreamable(), callback)
    })
  })

  it('repeated dependencies', function(callback) {
    var handlerFactory = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        should.exist(args.first)
        args.first.should.equal('first filter')

        should.exist(args.second)
        args.second.should.equal('second filter')

        should.exist(args.third)
        args.third.should.equal('third filter')

        callback(null, streamChannel.createEmptyStreamable())
      }

      callback(null, handler)
    }

    handlerFactory = middleware.createDependencyManagedHandlerFactory(
      handlerFactory, ['second-middleware', 'third-middleware'])

    var config = {
      middlewares: {
        'first-middleware': middleware1,
        'second-middleware': middleware2,
        'third-middleware': middleware3
      }
    }

    handlerFactory(config, function(err, handler) {
      if(err) throw err

      handler({}, streamChannel.createEmptyStreamable(), callback)
    })
  })
})