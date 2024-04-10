import type { Emitter } from 'mitt';
import { v4 as uuid } from 'uuid';
import mitt from 'mitt';
import { DebugVisualizer } from './debug-visualizer';

interface ToggleEvent {
    origin: string[];
    enabled: boolean;
}

interface LogEvent {
    type: 'log' | 'warn' | 'error';
    prefix: string[];
    origin: string[];
    message: any[];
}

interface RegistrationEvent {
    origin: string[];
    enabled: boolean;
}

interface Events extends Record<string | symbol, unknown> {
    toggle: ToggleEvent;
    message: LogEvent;
    register: RegistrationEvent;
}

type NamespaceParameter = string | Object | true | null;

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
    spawn(
        id?: string | Object | null,
        namespace?: NamespaceParameter
    ): DebugHelper;
}

type Constructor = new (...args: any[]) => any;
type ClassDecorator<T extends Constructor> = (
    constructor: T,
    context: ClassDecoratorContext
) => T;

export interface GlobalDebug extends DebugHelper {
    decorate<T extends Constructor>(prefix: string | null): ClassDecorator<T>;
}

export interface DecoratedWithDebug {
    debug: DebugHelper;
}

const eventProxy: Emitter<Events> = mitt();

class BasicDebugHelper implements DebugHelper {
    protected _visualize: boolean = false;
    protected _visualizer: DebugVisualizer = new DebugVisualizer();
    protected tags: string[] = [];

    constructor(
        protected id: string,
        protected _parents: string[],
        protected _namespace: string[] = [],
        protected startsEnabled: boolean = true
    ) {
        this.tags = [id, ..._parents];
        this.register(startsEnabled);
    }

    protected register(startsEnabled: boolean) {
        eventProxy.emit('register', {
            origin: this.origin,
            enabled: startsEnabled,
        });
    }

    public spawn(
        id: string | Object | null = null,
        namespace: NamespaceParameter = null,
        startsEnabled: boolean = true
    ): DebugHelper {
        let childId: string;

        if (id === null) {
            childId = uuid();
        } else if (typeof id !== 'string') {
            childId = id.constructor?.name;
        } else {
            childId = id;
        }

        let childNamespace = [...this._namespace];

        if (namespace !== null) {
            let parsedNamespace: string;

            if (namespace === true) {
                parsedNamespace = childId;
            } else if (typeof namespace !== 'string') {
                parsedNamespace = namespace.constructor?.name || '';
            } else {
                parsedNamespace = namespace;
            }

            childNamespace.push(parsedNamespace);
        }

        return new BasicDebugHelper(
            childId,
            this.origin,
            childNamespace,
            startsEnabled
        );
    }

    public enable(): DebugHelper {
        this.toggle(true);

        return this;
    }

    public disable(): DebugHelper {
        this.toggle(false);

        return this;
    }

    public toggle(enabled: boolean): DebugHelper {
        eventProxy.emit('toggle', {
            origin: this.origin,
            enabled,
        });

        return this;
    }

    protected get origin(): string[] {
        return [...this._parents, this.id];
    }

    public toggleVisualization(enabled: boolean): DebugHelper {
        this._visualize = enabled;

        return this;
    }

    protected message(type: LogEvent['type'], message: unknown[]): void {
        eventProxy.emit('message', {
            type,
            prefix: this._namespace,
            origin: [...this._parents, this.id],
            message,
        });
    }

    public log(...args: unknown[]): void {
        this.message('log', [...args]);
    }

    public warn(...args: unknown[]): void {
        this.message('warn', [...args]);
    }

    public error(...args: unknown[]): void {
        this.message('error', [...args]);
    }

    public devnull(...args: unknown[]): unknown[] {
        return args;
    }

    public async timeout(ms: number): Promise<void> {
        return new Promise((res) => {
            setTimeout(() => res(), ms);
        });
    }
}

class GlobalDebugHelper extends BasicDebugHelper {
    private globallyEnabled: boolean = false;
    // private config: Record<string, boolean> = {};
    private configMap: Map<string, boolean> = new Map();

    constructor() {
        super('Global', []);
        eventProxy.on('message', this.onMessage);
        eventProxy.on('register', this.onRegister);
        eventProxy.on('toggle', this.onToggle);
    }

    protected override register() {}

    private onRegister = ({ origin, enabled }: RegistrationEvent): void => {
        this.configMap.set(JSON.stringify(origin), enabled);
    };

    private onMessage = ({ type, message, prefix, origin }: LogEvent): void => {
        if (!this.globallyEnabled) return;

        if (!this.checkOriginEnabled(origin)) {
            return;
        }

        this[type](...this.prefix(...prefix), ...message);
    };

    private onToggle = ({ origin, enabled }: ToggleEvent): void => {
        this.configMap.set(JSON.stringify(origin), enabled);
    };

    private checkOriginEnabled(origin: string[]): boolean {
        const key = JSON.stringify(origin);
        return this.configMap.has(key) && this.configMap.get(key);
    }

    override log(...args: unknown[]): void {
        if (this.globallyEnabled) {
            console.log(...args);
            if (this._visualize) {
                this._visualizer.log(...args);
            }
        }
    }

    override warn(...args: unknown[]): void {
        if (this.globallyEnabled) {
            console.warn(...args);
            if (this._visualize) {
                this._visualizer.warn(...args);
            }
        }
    }

    override error(...args: unknown[]): void {
        if (this.globallyEnabled) {
            console.error(...args);
            if (this._visualize) {
                this._visualizer.error(...args);
            }
        }
    }

    override toggle(enabled: boolean) {
        this.globallyEnabled = enabled;

        return this;
    }

    // public setConfig(config: Record<string, boolean>): void {
    //     Object.keys(config).forEach((instanceId) => {
    //         // const enabled = config[instanceId];
    //         // this._eventInterface.emit(`toggle-${instanceId}`, enabled);
    //     });
    // }

    // protected get _prefix(): string {
    //     return this._namespace !== null ? `[${this._namespace}]` : '';
    // }

    protected prefix(...strings: string[]): string[] {
        return strings.map((s) => `[${s.trim()}]`);
    }

    public decorate<T extends Constructor>(
        prefix: string | null = null
    ): ClassDecorator<T> {
        return function withDebugDecorator(
            constructor: T,
            context: ClassDecoratorContext
        ): T {
            constructor.prototype.debug = debug.spawn(context.name, prefix);

            return constructor;
        };
    }
}

export const debug: GlobalDebug = new GlobalDebugHelper();
