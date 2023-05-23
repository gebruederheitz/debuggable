// export interface DebugHelper {
//     log: (...args: unknown[]) => void;
//     warn: (...args: unknown[]) => void;
//     error: (...args: unknown[]) => void;
//     enable: () => void;
//     disable: () => void;
//     timeout: (ms: number) => Promise<void>;
// }

import { DebugVisualizer } from './debug-visualizer.js';

class BasicDebugHelper {
    _enabled = false;
    _namespace = null;
    _parent = this;
    _visualize = false;
    _visualizer = new DebugVisualizer();

    constructor(namespace = null, enabled = true, parent = null) {
        if (namespace !== null) {
            this._namespace = namespace;
        }

        this._enabled = enabled;

        if (parent === null) {
            this._parent = this;
        } else {
            this._parent = parent;
        }
    }

    enable() {
        this._enabled = true;

        return this;
    }

    disable() {
        this._enabled = false;

        return this;
    }

    /**
     * @param {boolean} toggle
     */
    toggleVisualization(toggle) {
        this._visualize = toggle;
    }

    toggle(toggle) {
        this._enabled = toggle;

        return this;
    }

    log(...args) {
        if (this._enabled) this._parent.log(...this._prefix, ...args);
    }

    warn(...args) {
        if (this._enabled) this._parent.warn(...this._prefix, ...args);
    }

    error(...args) {
        if (this._enabled) this._parent.error(...this._prefix, ...args);
    }

    devnull(...args) {
        return args;
    }

    async timeout(ms) {
        return new Promise((res) => {
            setTimeout(() => res(), ms);
        });
    }

    get _prefix() {
        return this._namespace !== null
            ? [`%c[${this._namespace}]`, 'font-weight:bold;']
            : [''];
    }
}

class GlobalDebugHelper extends BasicDebugHelper {
    spawn(namespace = null) {
        return new BasicDebugHelper(namespace, this._enabled, this);
    }

    log(...args) {
        if (this._enabled) {
            console.log(...args);
            if (this._visualize) {
                this._visualizer.log(...args);
            }
        }
    }

    warn(...args) {
        if (this._enabled) {
            console.warn(...args);
            if (this._visualize) {
                this._visualizer.warn(...args);
            }
        }
    }

    error(...args) {
        if (this._enabled) {
            console.error(...args);
            if (this._visualize) {
                this._visualizer.error(...args);
            }
        }
    }
}

export const debug = new GlobalDebugHelper('Global');
