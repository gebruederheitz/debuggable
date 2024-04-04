import { expect } from 'chai';
import sinon from 'sinon';

import { debug } from '../dist/index.mjs';

describe('The debuggable library', () => {
    const sandbox = sinon.createSandbox();
    let consoleLog;

    beforeEach(() => {
        consoleLog = sandbox.replace(global.console, 'log', sinon.fake(global.console.log));
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should not display console output by default', () => {
        const child = debug.spawn('child disabled');

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog.called).to.be.false;
    });

    it('should display console output when debugging is enabled', () => {
        debug.enable();
        const child = debug.spawn('child');

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog.calledTwice).to.be.true;
    });

    it('should not display console output when debugging is disabled', () => {
        debug.disable();
        const child = debug.spawn('child disabled');

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog.called).to.be.false;
    });

    it('allows toggling individual children', () => {
        debug.enable();
        const activeChild = debug.spawn('activeChild');
        const silentChild = debug.spawn('silentChild');

        silentChild.disable();

        activeChild.log('Hello');
        activeChild.log('Goodbye');
        silentChild.log('Hello');
        silentChild.log('Goodbye');

        expect(consoleLog.calledTwice).to.be.true;
    });

    it('applies global scope to all children', () => {
        debug.disable();
        const child = debug.spawn();
        child.enable();

        child.log('Hello');

        expect(consoleLog.called).to.be.false;
    });

    it('prefixes child output', () => {
        debug.enable();
        const child = debug.spawn('child');

        child.log('Prefixed');

        expect(consoleLog.firstArg).to.equal('[child]');
    });
});
