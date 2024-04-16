// import { debug } from '../../dist/index.js';
import { debug } from '../../src';
import whenDomReady from 'when-dom-ready';

whenDomReady().then(() => {
    console.log('INIT');

    const child = debug.spawn('button', 'Button');
    debug.toggleVisualization(true);
    debug.enable();

    document.getElementById('btn').addEventListener('click', () => {
        child.log('Click!');
    });
});
