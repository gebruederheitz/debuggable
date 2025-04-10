import { Emitter } from 'mitt';

export interface ToggleEvent {
    enabled: boolean;
}

export interface DebugHelper {
    enabled: boolean;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    enable(): this;
    disable(): this;
    toggle(toggle: boolean): this;
    timeout(ms: number): Promise<void>;
    devnull(...args: unknown[]): unknown[];
    spawn(
        id?: string | object | null,
        namespace?: NamespaceParameter,
        startsEnabled?: boolean,
        ...tags: string[]
    ): DebugHelper;
    addTags(...tags: string[]): this;
    getPrefix(): string[];
}

export type Constructor<T = unknown> = new (...args: unknown[]) => T;
export type ClassDecorator<T extends Constructor> = (
    constructor: T,
    context?: ClassDecoratorContext
) => T;

export interface GlobalDebug extends DebugHelper {
    events: Emitter<Events>;
    decorate<T = unknown>(
        prefix: NamespaceParameter,
        ...tags: string[]
    ): ClassDecorator<Constructor<T>>;
    toggleVisualization(toggle: boolean): this;
    configure(
        config: Record<string, boolean> | null,
        options?: GlobalOptions | null
    ): this;
}

export interface DecoratedWithDebug {
    debug: DebugHelper;
}

export interface LogEvent {
    type: 'log' | 'warn' | 'error';
    instance: DebugHelper;
    message: unknown[];
}

export interface RegistrationEvent {
    instance: DebugHelper;
    parent: DebugHelper;
}

export interface Events extends Record<string | symbol, unknown> {
    toggle: ToggleEvent;
    message: LogEvent;
    register: RegistrationEvent;
}

export type NamespaceParameter = string | object | true | null;

export interface GlobalOptions {
    grouped: boolean;
    dotted: boolean;
}
