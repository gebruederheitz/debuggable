import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';


export default {
    input: 'test/fixtures/dom-visualize.fixture.ts',
    plugins: [
        typescript(),
        resolve({browser: true}),
        commonjs(),
    ],
    output: {
        dir: './test/fixtures/build/browser/',
        format: 'iife',
    },
};
