import mitt from 'mitt';
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
    spawn(namespace?: string | Object | null): DebugHelper;
}

export interface GlobalDebug extends DebugHelper {}

class BasicDebugHelper implements DebugHelper {
    protected _explicitlyEnabled = true;
    protected _inheritedEnabled = true;
    protected _namespace: string | null = null;
    protected _visualize: boolean = false;
    protected _visualizer: DebugVisualizer = new DebugVisualizer();

    private _parent: BasicDebugHelper | null = null;

    private _eventInterface = mitt();

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

        this._explicitlyEnabled = enabled;

        if (parent) {
            this._inheritedEnabled = parent._inheritedEnabled;
            this._parent = parent;

            parent.on('toggle', (enabled: boolean) => {
                this._inheritedEnabled = enabled;
                this._eventInterface.emit('toggle', enabled);
            });
        }
    }

    public get on() {
        return this._eventInterface.on;
    }

    public spawn(namespace: string | Object | null = null, enabled: boolean = true): BasicDebugHelper {
        return new BasicDebugHelper(namespace, enabled, this);
    }

    public get enabled(): boolean {
        return this._explicitlyEnabled && this._inheritedEnabled;
    }

    public enable(): DebugHelper {
        this._explicitlyEnabled = true;
        this._eventInterface.emit('toggle', true);

        return this;
    }

    public disable(): DebugHelper {
        this._explicitlyEnabled = false;
        this._eventInterface.emit('toggle', false);

        return this;
    }

    public toggle(enabled: boolean): DebugHelper {
        this._explicitlyEnabled = enabled;
        this._eventInterface.emit('toggle', enabled);

        return this;
    }

    public toggleVisualization(enabled: boolean): DebugHelper {
        this._visualize = enabled;

        return this;
    }

    public log(...args: unknown[]): void {
        if (this.enabled) this._parent.log(this._prefix, ...args);
    }

    public warn(...args: unknown[]): void {
        if (this.enabled) this._parent.warn(this._prefix, ...args);
    }

    public error(...args: unknown[]): void {
        if (this.enabled) this._parent.error(this._prefix, ...args);
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

class GlobalDebugHelper extends BasicDebugHelper {
    override log(...args: unknown[]): void {
        if (this._explicitlyEnabled) {
            console.log(...args);
            if (this._visualize) {
                this._visualizer.log(...args);
            }
        }
    }

    override warn(...args: unknown[]): void {
        if (this._explicitlyEnabled) {
            console.warn(...args);
            if (this._visualize) {
                this._visualizer.warn(...args);
            }
        }
    }

    override error(...args: unknown[]): void {
        if (this._explicitlyEnabled) {
            console.error(...args);
            if (this._visualize) {
                this._visualizer.error(...args);
            }
        }
    }
}

export const debug: GlobalDebug = new GlobalDebugHelper('Global', false, null);
