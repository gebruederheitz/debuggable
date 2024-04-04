import { DebugVisualizer } from './debug-visualizer';

export interface DebugHelper {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    enable(): DebugHelper;
    disable(): DebugHelper;
    toggle(toggle: boolean): DebugHelper;
    toggleVisualization(toggle: boolean): DebugHelper;
    timeout(ms: number): Promise<void>;
    devnull(...args: unknown[]): unknown[];
    enabled: boolean;
}

export interface GlobalDebug extends DebugHelper {
    spawn(namespace?: string | Object | null): DebugHelper;
}

class BasicDebugHelper implements DebugHelper {
    protected _enabled = false;
    protected _namespace: string | null = null;
    protected _parent: BasicDebugHelper = this;
    protected _visualize: boolean = false;
    protected _visualizer: DebugVisualizer = new DebugVisualizer();

    constructor(
        namespace: string | Object | null = null,
        enabled = true,
        parent: BasicDebugHelper | null = null
    ) {
        if (namespace !== null) {
            if (typeof namespace !== 'string') {
                this._namespace = namespace.constructor.name;
            } else {
                this._namespace = namespace;
            }
        }

        this._enabled = enabled;

        if (parent === null) {
            this._parent = this;
        } else {
            this._parent = parent;
        }
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public enable(): DebugHelper {
        this._enabled = true;

        return this;
    }

    public disable(): DebugHelper {
        this._enabled = false;

        return this;
    }

    public toggle(enabled: boolean): DebugHelper {
        this._enabled = enabled;

        return this;
    }

    public toggleVisualization(enabled: boolean): DebugHelper {
        this._visualize = enabled;

        return this;
    }

    public log(...args: unknown[]): void {
        if (this._enabled) this._parent.log(this._prefix, ...args);
    }

    public warn(...args: unknown[]): void {
        if (this._enabled) this._parent.warn(this._prefix, ...args);
    }

    public error(...args: unknown[]): void {
        if (this._enabled) this._parent.error(this._prefix, ...args);
    }

    public devnull(...args: unknown[]): unknown[] {
        return args;
    }

    public async timeout(ms: number): Promise<void> {
        return new Promise((res) => {
            setTimeout(() => res(), ms);
        });
    }

    protected get _prefix(): string {
        return this._namespace !== null ? `[${this._namespace}]` : '';
    }
}

class GlobalDebugHelper extends BasicDebugHelper implements GlobalDebug {
    public spawn(namespace: string | Object | null = null): BasicDebugHelper {
        return new BasicDebugHelper(namespace, this._enabled, this);
    }

    override log(...args: unknown[]): void {
        if (this._enabled) {
            console.log(...args);
            if (this._visualize) {
                this._visualizer.log(...args);
            }
        }
    }

    override warn(...args: unknown[]): void {
        if (this._enabled) {
            console.warn(...args);
            if (this._visualize) {
                this._visualizer.warn(...args);
            }
        }
    }

    override error(...args: unknown[]): void {
        if (this._enabled) {
            console.error(...args);
            if (this._visualize) {
                this._visualizer.error(...args);
            }
        }
    }
}

export const debug: GlobalDebug = new GlobalDebugHelper('Global', false);
