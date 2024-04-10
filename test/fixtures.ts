import { debug } from '../dist/index.js';
import type { DecoratedWithDebug} from '../dist/types';

export interface DecoratedDummyClass extends DecoratedWithDebug {}
@debug.decorate('decorated')
export class DecoratedDummyClass {
    poke() {
        this.debug.log('Ouch');
    }
}

export const globalDebugInstance = debug;
