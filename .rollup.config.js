import babel from '@rollup/plugin-babel';
// import commonjs from '@rollup/plugin-commonjs';
// import resolve from '@rollup/plugin-node-resolve';

function serve() {
    let server;
    function toExit() {
        if (server) server.kill(0);
    }
    return {
        writeBundle() {
            if (server) return;
            server = require('child_process').spawn(
                'npm',
                ['run', `start`, '--', '--dev'],
                {
                    stdio: ['ignore', 'inherit', 'inherit'],
                    shell: true,
                }
            );

            process.on('SIGTERM', toExit);
            process.on('exit', toExit);
        },
    };
}

const babelConfig = (bundledHelpers = false) => ({
    babelrc: false,
    exclude: [/\/core-js\//, 'node_modules/**'],
    sourceMaps: true,
    inputSourceMap: true,
    babelHelpers: bundledHelpers ? 'bundled' : 'runtime',
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'usage',
                corejs: 3,
            }
        ],
    ],
    plugins: bundledHelpers ? [] : [
        '@babel/plugin-transform-runtime',
    ],
});

export default [
    {
        external: [
            /@babel\/runtime/,
        ],
        input: 'src/index.js',
        output: {
            file: 'dist/index.mjs',
            format: 'esm',
            sourcemap: true,
        },
        plugins: [
            // resolve(),
            babel(babelConfig()),
            // commonjs(),
        ],
    },
];
