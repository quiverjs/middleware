
'use strict'

var util = require('./util')
var param = require('./param')
var handler = require('./handler')
var middleware = require('./middleware')
var mergeObjects = require('quiver-merge').mergeObjects

module.exports = mergeObjects([
  util, middleware, handler, param
])