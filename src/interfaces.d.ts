import { Emitter } from 'mitt';

export interface ToggleEvent {
    enabled: boolean;
}

export interface DebugHelper {
    enabled: boolean;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    enable(): DebugHelper;
    disable(): DebugHelper;
    toggle(toggle: boolean): DebugHelper;
    timeout(ms: number): Promise<void>;
    devnull(...args: unknown[]): unknown[];
    spawn(
        id?: string | Object | null,
        namespace?: NamespaceParameter,
        startsEnabled?: boolean,
        ...tags: string[]
    ): DebugHelper;
    addTags(...tags: string[]): DebugHelper;
    getPrefix(): string[];
}

export type Constructor = new (...args: any[]) => any;
export type ClassDecorator<T extends Constructor> = (
    constructor: T,
    context: ClassDecoratorContext
) => T;

export interface GlobalDebug extends DebugHelper {
    events: Emitter<Events>;
    decorate<T extends Constructor>(
        prefix: string | null,
        ...tags: string[]
    ): ClassDecorator<T>;
    toggleVisualization(toggle: boolean): DebugHelper;
}

export interface DecoratedWithDebug {
    debug: DebugHelper;
}

export interface LogEvent {
    type: 'log' | 'warn' | 'error';
    instance: DebugHelper;
    message: any[];
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

export type NamespaceParameter = string | Object | true | null;
