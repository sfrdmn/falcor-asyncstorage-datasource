import {error as $error} from 'falcor-json-graph'
import {set, get} from 'object-path'
import merge from 'lodash.merge'
import Observable from 'zen-observable'

import toRx from './es-to-rx'
import {reduce as reducePaths} from './path-transforms'

var errorCodes = {
  READ_FAIL: 'read_fail',
  WRITE_FAIL: 'write_fail',
  UNSUPPORTED: 'unsupported'
}

class AsyncStorageDataSource {

  constructor (store, options) {
    options = options || {}
    this._encodeKey = options.encodeKey || encodeKey
    this._decodeKey = options.decodeKey || decodeKey
    this._store = store
  }

  get (pathSets) {
    var encode = this._encodeKey
    var store = this._store
    var keys = reducePaths(pathSets, function (acc, path) {
      acc.push(encode(path))
      return acc
    }, [])
    var toEnvelope = keyValPairsToEnvelope(this._decodeKey, pathSets)
    
    return toRx(new Observable(function (observer) {
      store.multiGet(keys).then(function (keyValPairs) {
        observer.next(toEnvelope(keyValPairs))
        observer.complete()
      }).catch(function (errors) {
        // TODO React Native currently never calls this :/
        // https://github.com/facebook/react-native/issues/9724
        observer.error($error({
          status: errorCodes.READ_FAIL,
          message: 'Failed to read from AsyncStorage'
        }))
      })
    }))
  }

  set (envelope) {
    var store = this._store
    var decode = this._decodeKey
    var toKeyValPairs = envelopeToKeyValPairs(this._encodeKey)
    return toRx(new Observable(function (observer) {
      store.multiSet(toKeyValPairs(envelope))
        .then(function () {
          observer.next(merge({}, envelope))
          observer.complete()
        }).catch(function (errors) {
          var graph = errors.reduce((graph, err) => {
            set(graph, decode(err.key), $error({
              status: errorCodes.WRITE_FAIL,
              message: 'Failed to write to AsyncStorage',
              key: err.key,
              detail: err.message
            }))
            return graph
          }, merge({}, envelope.jsonGraph))
          observer.next({
            paths: merge([], envelope.paths),
            jsonGraph: graph,
          })
          observer.complete()
        })
    }))
  }

  call () {
    return toRx(new Observable((observer) => {
      observer.error($error({
        status: errorCodes.UNSUPPORTED,
        message: 'AsyncStorageDataSource does not support call operations'
      }))
    }))
  }
}

function envelopeToKeyValPairs (encode) {
  return function (envelope) {
    var graph = envelope.jsonGraph
    var paths = envelope.paths
    return reducePaths(paths, function (acc, path) {
      acc.push([encode(path), get(graph, path)])
      return acc
    }, [])
  }
}

function keyValPairsToEnvelope (decode, pathSets) {
  return function (keyValPairs) {
    return keyValPairs.reduce(function (envelope, [key, val]) {
      var path = decode(key)
      set(envelope.jsonGraph, path, val)
      return envelope
    }, {paths: merge([], pathSets), jsonGraph: {}})
  }
}

function encodeKey (path) {
  return path.join('!')
}

function decodeKey (key) {
  return key.split('!')
}

export {
  AsyncStorageDataSource as default,
  errorCodes
}
