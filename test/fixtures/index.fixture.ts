import { debug } from '../../src';
import { DecoratedWithDebug } from '../../src';

export interface DecoratedDummyClass extends DecoratedWithDebug {}
@debug.decorate<DecoratedDummyClass>('decorated', 'tag')
export class DecoratedDummyClass {
    poke() {
        this.debug.log('Ouch');
    }
}

@debug.decorate('grandchild')
export class DecoratedDummyChild extends DecoratedDummyClass {}

export const globalDebugInstance = debug;
