import {AsyncStorage} from 'react-native'
import {error as $error} from 'falcor-json-graph'
import {get, set} from 'object-path'
const test = require('./tape')

import AsyncStorageDataSource, {errorCodes} from 'falcor-asyncstorage-datasource'

class BrokenAsyncStorage {
  constructor (data) {
    // White list keys with this prefix
    this.safePrefix = 'byId!1!'
    this.db = data || {}
  }
  
  multiSet (keyValPairs) {
    return new Promise((resolve, reject) => {
      var errors = keyValPairs.reduce((errors, [key, val]) => {
        if (key.startsWith(this.safePrefix)) {
          set(this.db, key, val)
        } else {
          var err = new Error('nope')
          err.key = key
          errors.push(err)
        }
        return errors
      }, [])
      reject(errors)
    })
  }

  multiGet (keys) {
    return new Promise((resolve, reject) => {
      resolve(keys.map((key) => {
        return [key, get(this.db, key)]
      }))
    })
  }
}

const datasource = new AsyncStorageDataSource(AsyncStorage)

module.exports = function () {
  test('ok', function (t) {
    t.plan(1)
    t.ok(true, 'true is true')
  })

  test('can instantiate data source', (t) => {
    t.plan(1)
    t.ok(datasource, 'instantiated data source')
  })

  test('get operation yields expected response', (t) => {
    t.plan(2)
    const data = [
      ['byId!0!name', 'Sean'],
      ['byId!0!motto', 'im sad']
    ]
    const pathSets = [['byId', 0, ['name', 'motto']]]
    const expected = {
      paths: pathSets, 
      jsonGraph: {byId: {0: {name: 'Sean', motto: 'im sad'}}}
    }
    const error = errorHandler(t)

    hydrateDb(data, error)(querySource(cleanUp(t)))

    function querySource (next) {
      return () => {
        datasource.get(pathSets).subscribe((envelope) => {
          t.deepEqual(envelope, expected,
            'get operation yielded expected response')
          next()
        }, error)
      }
    }
  })

  test('get operation works on complex paths', (t) => {
    t.plan(2)
    const data = [
      ['byId!1!taste', 'good'],
      ['byId!2!taste', 'bad'],
      ['byId!5!taste', 'terrible']
    ]
    const pathSets = [['byId', [5, {from: 1, to: 2}], 'taste']]
    const expected = {
      paths: pathSets,
      jsonGraph: {
        byId: {1: {taste: 'good'},
               2: {taste: 'bad'},
               5: {taste: 'terrible'}}
      }
    }
    const error = errorHandler(t)

    hydrateDb(data, error)(querySource(cleanUp(t)))

    function querySource (next) {
      return () => {
        datasource.get(pathSets).subscribe((envelope) => {
          t.deepEqual(envelope, expected,
            'query with complex paths yields expected response')
          next()
        }, error)
      }
    }
  })

  test('set operation yields expected response', (t) => {
    t.plan(3)
    const data = [['byId!0!mood', ':(']]
    const pathSets = [['byId', 0, 'mood']]
    const expected = {
      paths: pathSets,
      jsonGraph: {byId: {0: {mood: ':)'}}}
    }
    const error = errorHandler(t)

    hydrateDb(data, error)(doSet(querySource(cleanUp(t))))

    function doSet (next) {
      return () => {
        datasource.set({
          paths: pathSets,
          jsonGraph: {byId: {0: {mood: ':)'}}}
        }).subscribe((envelope) => {
          t.deepEqual(envelope, expected, 'set operation yields expected response')
          next()
        }, error)
      }
    }

    function querySource (next) {
      return () => {
        datasource.get(pathSets).subscribe((envelope) => {
          t.deepEqual(envelope, expected, 'set operation succeeded')
          next()
        }, error)
      }
    }
  })

  test('partially successful set yields partial response', (t) => {
    t.plan(3)
    const pathSets = [['byId', 0, 'message'],
                      ['byId', 1, 'hiddenMotive']]
    const badsource = new AsyncStorageDataSource(new BrokenAsyncStorage({
      'byId!0!message': 'wussup',
      'byId!0!hiddenMotive': 'wants to beat you up',
      'byId!1!message': 'wow you are dumb',
      'byId!1!hiddenMotive': 'crippling insecurity'
    }))
    const error = errorHandler(t)
    
    doSet(noop)()

    function doSet (next) {
      return () => {
        badsource.set({
          paths: pathSets,
          jsonGraph: {
            byId: {0: {message: 'eyyyy'},
                   1: {hiddenMotive: 'actually loves you'}}
          }
        }).subscribe((envelope) => {
          var graph = envelope.jsonGraph
          t.deepEqual(envelope.paths, pathSets,
            'envelope paths are sane')
          t.deepEqual(graph.byId[1], {
            hiddenMotive: 'actually loves you'
          }, 'white listed path was modified')
          t.deepEqual(graph.byId[0].message.value.status,
            errorCodes.WRITE_FAIL, 'failed set operation yields error')
          next()
        }, error)
      }
    }
  })

  test('call operations emit error', (t) => {
    t.plan(1)
    datasource.call(['list', 'push'], 'whatev').subscribe(() => {
      t.fail('call did not emit error')
    }, (err) => {
      t.equal(err.value.status, errorCodes.UNSUPPORTED,
        'call emits error')
    })
  })
}

function hydrateDb (data, error) {
  return (next) => {
    AsyncStorage.multiSet(data).then(next).catch(error)
  }
}

function errorHandler (t) {
  return (err) => {
    t.error(err)
  }
}

function cleanUp (t) {
  return () => {
    return AsyncStorage.clear(() => {
      t.ok(true, 'cleaned up storage')
    })
  }
}

function noop () {}
