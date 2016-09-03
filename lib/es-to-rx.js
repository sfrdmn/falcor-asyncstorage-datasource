/**
 * Compat layer for converting ES proposal observables to RX observables
 */

module.exports = function esToRx (observable) {
  function RxCompatObservable () {
    this.subscribe = this.forEach = proxyMethod(observable, 'subscribe')
  }
  RxCompatObservable.prototype = observable
  return new RxCompatObservable()
}

function proxyMethod (observable, method) {
  return function (a, b, c) {
    var observer = a

    if (observer && typeof observer === 'object') {
      a = observer.onNext.bind(observer)
      b = observer.onError.bind(observer)
      c = observer.onCompleted.bind(observer)
    }

    var sub = observable[method]({
      next: a || noop,
      error: b || noop,
      complete: c || noop
    })

    switch (typeof sub) {
      case 'function':
        return {dispose: sub}
      case 'object':
        return sub ? {
          dispose: function () {
            sub.unsubscribe()
          }
        } : {dispose: noop}
      default:
        return { dispose: noop }
    }
  }
}

function noop () {}
