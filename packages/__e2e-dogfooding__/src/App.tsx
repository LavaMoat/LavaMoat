/** @jsx h */
import { Fragment, h } from 'preact';

interface ButtonProps {
  onClick?: () => void;
  text?: string;
}

const Button: FunctionComponent<ButtonProps> = ({ onClick, text = 'Click Me' }) => (
  <button onClick={onClick}>{text}</button>
);

const App = () => {
  return (
    <div>
      <h1>Hello, Preact with TypeScript!</h1>
      <button onClick={() => console.log('clicked')}>Click Me</button>
    </div>
  );
};

export default App;