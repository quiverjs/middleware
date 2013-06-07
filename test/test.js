
'use strict'

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

  var middleware1 = middleware.createStreamMiddleware({
    filter: filter1,
    name: 'first-middleware'
  })
  var middleware2 = middleware.createStreamMiddleware({
    filter: filter2,
    name: 'second-middleware',
    dependencies: ['first-middleware']
  })
  var middleware3 = middleware.createStreamMiddleware({
    filter: filter3,
    name: 'third-middleware',
    dependencies: ['first-middleware']
  })

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

    var config = {
      'stream-middlewares': {
        'first-middleware': middleware1
      }
    }

    middleware2(config, handlerBuilder, function(err, handler) {
      if(err) throw err

      handler({}, streamChannel.createEmptyStreamable(), callback)
    })
  })

  it('repeated dependencies', function(callback) {
    var handlerBuilder = function(config, callback) {
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
    handlerBuilder = middleware.createDependencyManagedStreamHandlerBuilder(
      ['second-middleware', 'third-middleware'], handlerBuilder)

    var config = {
      'stream-middlewares': {
        'first-middleware': middleware1,
        'second-middleware': middleware2,
        'third-middleware': middleware3
      }
    }

    handlerBuilder(config, function(err, handler) {
      should.not.exist(err)

      handler({}, streamChannel.createEmptyStreamable(), callback)
    })
  })

  it('cyclic dependency prevention test', function(callback) {
    var middleware1 = middleware.createStreamMiddleware({
      name: 'first-middleware',
      dependencies: ['second-middleware']
    })

    var middleware2 = middleware.createStreamMiddleware({
      name: 'second-middleware',
      dependencies: ['first-middleware']
    })

    var handlerBuilder = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        callback(null, streamChannel.createEmptyStreamable())
      }
      callback(null, handler)
    }

    var config = {
      'stream-middlewares': {
        'first-middleware': middleware1,
        'second-middleware': middleware2
      }
    }

    middleware1(config, handlerBuilder, function(err, handler) {
      should.exist(err)

      callback()
    })
  })
})
