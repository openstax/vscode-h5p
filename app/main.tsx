import { render } from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'h5p-standalone/dist/main.bundle.js';
import 'h5p-standalone/dist/frame.bundle.js';
import 'h5p-standalone/dist/styles/h5p.css';

import './index.css';
import App from './App';

render(<App />, document.getElementById('root'));
