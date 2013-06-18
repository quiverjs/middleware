
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

describe('input handleable test', function() {
  it('basic input handleable', function(callback) {
    var inputHandlerBuilder1 = function(config, callback) {
      var handler = function(args, inputStreamable, callback) {
        callback(null, streamConvert.textToStreamable('input handleable 1'))
      }

      callback(null, handler)
    }

    var inputHandleableMiddleware1 = middleware.createInputHandleableMiddleware({
      name: 'input-handleable-1',
      inputHandlerBuilder: inputHandlerBuilder1
    })

    var inputHandlerBuilder2 = function(config, callback) {
      var handler1 = config.inputHandleables['input-handleable-1'].toStreamHandler()

      var handler = function(args, inputStreamable, callback) {
        handler1(args, inputStreamable, callback)
      }

      callback(null, handler)
    }

    var inputHandleableMiddleware2 = middleware.createInputHandleableMiddleware({
      name: 'input-handleable-2',
      inputHandlerBuilder: inputHandlerBuilder2,
      dependencies: ['input-handleable-1']
    })

    var mainHandlerBuilder = function(config, callback) {
      var handler2 = config.inputHandleables['input-handleable-2'].toStreamHandler()

      handler2({}, streamChannel.createEmptyStreamable(), function(err, resultStreamable) {
        if(err) throw err

        streamConvert.streamableToText(resultStreamable, function(err, text) {
          if(err) throw err

          text.should.equal('input handleable 1')

          callback(null, handler2)
        })
      })
    }

    mainHandlerBuilder = middleware.createDependencyManagedStreamHandlerBuilder(
      ['input-handleable-2'], mainHandlerBuilder)

    var config = {
      'stream-middlewares': {
        'input-handleable-1': inputHandleableMiddleware1,
        'input-handleable-2': inputHandleableMiddleware2
      }
    }

    mainHandlerBuilder(config, function(err, handler) {
      should.not.exist(err)
      should.exist(handler)

      callback()
    })
  })
})
