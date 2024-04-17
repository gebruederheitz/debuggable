import type { Emitter } from 'mitt';
import type {
    ClassDecorator,
    Constructor,
    DebugHelper,
    Events,
    GlobalDebug,
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
        id: string | Object | null = null,
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

    public enable(): DebugHelper {
        this.toggle(true);

        return this;
    }

    public disable(): DebugHelper {
        this.toggle(false);

        return this;
    }

    public toggle(enabled: boolean): DebugHelper {
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
        return new Promise((res) => {
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

class GlobalDebugHelper extends BasicDebugHelper {
    protected _visualize: boolean = false;
    protected _visualizer: DebugVisualizer = new DebugVisualizer();
    private globallyEnabled: boolean = false;
    private tree: SymbolTree = new SymbolTree();

    constructor() {
        super('Global', []);
        eventProxy.on('message', this.onMessage);
        eventProxy.on('register', this.onRegister);
    }

    public get events() {
        return eventProxy;
    }

    public toggleVisualization(enabled: boolean): DebugHelper {
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

    public configure(config: Record<string, boolean>): this {
        Object.keys(config).forEach((instanceIdOrTag) => {
            const shouldBeEnabled = config[instanceIdOrTag];
            eventProxy.emit(`toggle_${instanceIdOrTag}`, {
                enabled: shouldBeEnabled,
            });
        });

        return this;
    }

    public decorate<T extends Constructor>(
        prefix: string | null = null,
        ...tags: string[]
    ): ClassDecorator<T> {
        return function withDebugDecorator(
            constructor: T,
            context: ClassDecoratorContext
        ): T {
            const base = constructor.prototype?.debug || debug;
            const name = context?.name || constructor.name || null;

            constructor.prototype.debug = base
                .spawn(name, prefix)
                .addTags(...tags);

            return constructor;
        };
    }

    protected override listen(): void {}

    protected prefix(...strings: string[]): string[] {
        return strings.map((s) => `[${s.trim()}]`);
    }

    private onRegister = ({ instance, parent }: RegistrationEvent): void => {
        this.tree.appendChild(parent, instance);
    };

    private onMessage = ({ type, message, instance }: LogEvent): void => {
        if (!this.globallyEnabled) return;

        if (!this.checkOriginEnabled(instance)) {
            return;
        }

        this[type](...this.prefix(...instance.getPrefix()), ...message);
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
