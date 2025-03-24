/** @jsx h */
import { h, render } from 'preact';
import App from './App';

// Make sure we have a container
const container = document.getElementById('app') || (() => {
  const div = document.createElement('div');
  div.id = 'app';
  document.body.appendChild(div);
  return div;
})();

render(<App />, container);