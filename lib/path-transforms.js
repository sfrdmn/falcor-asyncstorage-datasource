var util = require('falcor-path-utils')
var iterateKeySet = util.iterateKeySet

var from = require('./from')

function forEach (pathSets, fn) {
  pathSets.forEach(function (pathSet) {
    dive(pathSet, 0, [])
  })

  function dive (pathSet, depth, currPath) {
    if (!pathSet || !pathSet.length || pathSet[depth] === void 0) {
      return
    }
    var it = {}
    var keySet = pathSet[depth]
    var nextDepth = depth + 1
    var leaf = nextDepth === pathSet.length
    var key = iterateKeySet(keySet, it)
    
    do {
      currPath.push(key)
      if (leaf) {
        fn(from(currPath))
      } else {
        dive(pathSet, nextDepth, currPath)
      }
      currPath.pop(key)
    } while (!it.done && (key = iterateKeySet(keySet, it)))
  }
}

function reduce (pathSets, fn, acc) {
  forEach(pathSets, function (path) {
    acc = fn(acc, path)
  })
  return acc
}

module.exports = {
  forEach: forEach,
  reduce: reduce
}
