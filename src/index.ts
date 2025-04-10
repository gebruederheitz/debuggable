import type { Emitter } from 'mitt';
import type {
    ClassDecorator,
    Constructor,
    DebugHelper,
    Events,
    GlobalDebug,
    GlobalOptions,
    LogEvent,
    NamespaceParameter,
    RegistrationEvent,
    ToggleEvent,
} from './interfaces';

import mitt from 'mitt';
import { v4 as uuid } from 'uuid';
import SymbolTree from 'symbol-tree';
import { DebugVisualizer } from './debug-visualizer';

const eventProxy: Emitter<Events> = mitt();

const DEFAULT_GLOBAL_OPTIONS: GlobalOptions = {
    grouped: false,
    dotted: false,
};

class BasicDebugHelper implements DebugHelper {
    constructor(
        protected id: string,
        protected _namespace: string[] = [],
        public enabled: boolean = true,
        protected tags: string[] = []
    ) {
        this.listen();
    }

    public spawn(
        id: string | object | null = null,
        namespace: NamespaceParameter = null,
        startsEnabled: boolean = true,
        ...tags: string[]
    ): DebugHelper {
        let childId: string;

        if (id === null) {
            childId = uuid();
        } else if (typeof id !== 'string') {
            childId = id.constructor?.name;
        } else {
            childId = id;
        }

        const childNamespace = [...this._namespace];

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

        const child = new BasicDebugHelper(
            childId,
            childNamespace,
            startsEnabled,
            tags
        );

        eventProxy.emit('register', {
            instance: child,
            parent: this,
        });

        return child;
    }

    public addTags(...tags: string[]): this {
        this.tags.push(...tags);
        this.listenForTags(tags);

        return this;
    }

    public enable(): this {
        this.toggle(true);

        return this;
    }

    public disable(): this {
        this.toggle(false);

        return this;
    }

    public toggle(enabled: boolean): this {
        this.enabled = enabled;

        return this;
    }

    protected message(type: LogEvent['type'], message: unknown[]): void {
        eventProxy.emit('message', {
            type,
            instance: this,
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
        return new Promise<void>((res) => {
            setTimeout(() => res(), ms);
        });
    }

    public getPrefix(): string[] {
        return this._namespace;
    }

    protected listen(): void {
        eventProxy.on(`toggle_${this.id}`, this.onToggle);
        this.listenForTags(this.tags);
    }

    protected listenForTags(tags: string[]): void {
        tags.forEach((tag) => {
            eventProxy.on(`toggle_${tag}`, this.onToggle);
        });
    }

    protected onToggle = ({ enabled }: ToggleEvent) => {
        this.enabled = enabled;
    };
}

class GlobalDebugHelper
    extends BasicDebugHelper
    implements GlobalDebug, DebugHelper
{
    protected _visualize: boolean = false;
    protected _visualizer: DebugVisualizer = new DebugVisualizer();
    protected options: GlobalOptions = DEFAULT_GLOBAL_OPTIONS;
    private globallyEnabled: boolean = false;
    private tree: SymbolTree = new SymbolTree();

    constructor() {
        super('Global', []);
        eventProxy.on('message', this.onMessage);
        eventProxy.on('register', this.onRegister);
    }

    public getOptions(): GlobalOptions {
        return this.options;
    }

    public get events() {
        return eventProxy;
    }

    public toggleVisualization(enabled: boolean): this {
        this._visualize = enabled;

        return this;
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

    public configure(
        config: Record<string, boolean> = null,
        options: GlobalOptions = null
    ): this {
        if (config) {
            Object.keys(config).forEach((instanceIdOrTag) => {
                const shouldBeEnabled = config[instanceIdOrTag];
                eventProxy.emit(`toggle_${instanceIdOrTag}`, {
                    enabled: shouldBeEnabled,
                });
            });
        }

        if (options) {
            this.options = {
                ...this.options,
                ...options,
            };
        }

        return this;
    }

    public decorate<T extends Constructor>(
        prefix: NamespaceParameter = null,
        ...tags: string[]
    ): ClassDecorator<T> {
        return function withDebugDecorator(
            constructor: T,
            context: ClassDecoratorContext = null
        ): T {
            const base: DebugHelper =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (constructor.prototype?.debug as DebugHelper) || debug;
            const name = context?.name || constructor.name || null;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            constructor.prototype.debug = base
                .spawn(name, prefix)
                .addTags(...tags);

            return constructor;
        };
    }

    protected override listen(): void {}

    protected prefix(...strings: string[]): string[] {
        const prefix = this.preparePrefix(strings);
        if (this.doGrouping()) {
            console.group(...prefix);

            return [];
        }
        return prefix;
    }

    private doGrouping(): boolean {
        return this.options.grouped && typeof console.group === 'function';
    }

    private preparePrefix(strings: string[]): string[] {
        if (this.options.dotted) {
            const prefix = strings.map((s) => s.trim()).join('.');

            return this.doGrouping() ? [prefix] : [`[${prefix}]`];
        } else {
            return strings.map((s) => `[${s.trim()}]`);
        }
    }

    protected suffix(): void {
        if (this.options.grouped && typeof console.groupEnd === 'function') {
            console.groupEnd();
        }
    }

    private onRegister = ({ instance, parent }: RegistrationEvent): void => {
        this.tree.appendChild(parent, instance);
    };

    private onMessage = ({ type, message, instance }: LogEvent): void => {
        if (!this.globallyEnabled) {
            return;
        }

        if (!this.checkOriginEnabled(instance)) {
            return;
        }

        this[type](...this.prefix(...instance.getPrefix()), ...message);
        this.suffix();
    };

    private checkOriginEnabled(instance: DebugHelper): boolean {
        return (
            instance.enabled &&
            this.tree
                .ancestorsToArray(instance)
                .every((parent: DebugHelper) => parent.enabled)
        );
    }
}

export const debug: GlobalDebug = new GlobalDebugHelper();
export type {
    DecoratedWithDebug,
    DebugHelper,
    GlobalDebug,
} from './interfaces';
