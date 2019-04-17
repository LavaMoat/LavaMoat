import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
const DepGraph = require('./graphs/DepGraph') 

class App extends Component {
  render() {
    return (
      <div className="App">
        <DepGraph/>
      </div>
    );
  }
}

export default App;
