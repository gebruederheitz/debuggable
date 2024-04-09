import { expect } from 'chai';
import sinon from 'sinon';

import { debug } from '../dist/index.mjs';
import { FixtureDummyClass } from './fixture-class.mjs';

describe('The debuggable library', () => {
    const sandbox = sinon.createSandbox();
    let consoleLog;

    beforeEach(() => {
        consoleLog = sandbox.replace(global.console, 'log', sinon.fake());
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

    it('can use a class name as a prefix when passed an object', () => {
        debug.enable();
        const object = new FixtureDummyClass();
        const child = debug.spawn(object);

        child.log('Prefixed');

        expect(consoleLog.firstArg).to.equal('[FixtureDummyClass]');
    });

    it('can skip prefixing', () => {
        debug.enable();
        const child = debug.spawn();

        child.log('Not Prefixed');

        expect(consoleLog.firstArg).to.equal('');
    });

    it('stacks prefixes', () => {
        debug.enable();
        const child = debug.spawn('child');
        const grandchild = child.spawn('grandchild')

        grandchild.log('Stacked prefixes');

        expect(consoleLog.firstArg).to.equal('[child]');
        expect(consoleLog.args[0]).to.include.ordered.members(['[child]', '[grandchild]']);
    });

    it('allows recursion', () => {
        debug.enable();

        const child = debug.spawn('child');
        const grandchild = child.spawn('grandchild');
        const greatGrandchild = grandchild.spawn('greatgrandchild');

        // These three should all be displayed
        child.log('hi daddy');
        grandchild.log('hi granddad');
        greatGrandchild.log('hi great-granddaddy');

        child.disable();

        // These three should not
        child.log('hi again daddy');
        grandchild.log('hi again granddad');
        greatGrandchild.log('hi again great-granddaddy');

        child.enable();
        grandchild.disable();

        // This one is now back in the game...
        child.log('hi again daddy');
        // ...while the next two aren't.
        grandchild.log('hi again granddad');
        greatGrandchild.log('hi again great-granddaddy');

        expect(consoleLog.callCount).to.equal(4);
    })
});