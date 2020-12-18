import React from 'react';
import ReactDOM from 'react-dom';
import 'codemirror'
import 'codemirror/lib/codemirror.css'
import './css/index.css';
import App from './App.js';
import * as serviceWorker from './serviceWorker.js';

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
