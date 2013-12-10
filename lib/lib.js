
'use strict'

var util = require('./util')
var middleware = require('./middleware')
var inputHandler = require('./handler')
var param = require('./param')
var mergeObjects = require('quiver-merge').mergeObjects

module.exports = mergeObjects([
  util, middleware, inputHandler, param
])