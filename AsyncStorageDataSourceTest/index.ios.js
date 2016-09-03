import React from 'react'
import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native'
import test from './tape'
import runTests from './run-tests'

const style = {
  paddingLeft: 10,
  paddingTop: 40,
}

const AsyncStorageDataSourceTest = React.createClass({

  getInitialState () {
    return {results: ''}
  },
  
  componentWillMount () {
    test.createStream().on('data', function (b) {
      this.setState({
        results: this.state.results += b.toString()
      })
    }.bind(this))
    runTests()
  },
  
  render() {
    return (
      <Text style={style}>
        {this.state.results}
      </Text>
    )
  },
})

AppRegistry.registerComponent('AsyncStorageDataSourceTest', () => AsyncStorageDataSourceTest);
