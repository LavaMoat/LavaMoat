import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
const SimpleGraph = require('./graphs/SimpleGraph') 

class App extends Component {
  render() {
    return (
      <div className="App">
        <SimpleGraph/>
      </div>
    );
  }
}

export default App;
