import { expect } from 'chai';
import sinon from 'sinon';

import { debug } from '../dist/index.mjs';
import { DecoratedDummyClass, globalDebugInstance } from './fixtures.js';

describe('The debuggable library', () => {
    const sandbox = sinon.createSandbox();
    let consoleLog;

    beforeEach(() => {
        consoleLog = sandbox.replace(global.console, 'log', sinon.fake());
        // consoleLog = sandbox.replace(global.console, 'log', sinon.fake(console.log));
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
        const child = debug.spawn('child', true);

        child.log('Prefixed');

        expect(consoleLog.firstArg).to.equal('[child]');
    });

    it('can use a class name as an id and prefix when passed an object', () => {
        debug.enable();
        const object = new (class FixtureDummyClass {})();
        const child = debug.spawn(object, true);

        child.log('Prefixed');

        expect(consoleLog.firstArg).to.equal('[FixtureDummyClass]');
    });

    it('can skip prefixing', () => {
        debug.enable();
        const child = debug.spawn();

        child.log('Not Prefixed');

        expect(consoleLog.firstArg).to.equal('Not Prefixed');
    });

    it('can have a custom prefix', () => {
        debug.enable();
        const child = debug.spawn('child', 'not-the-id');

        child.log('Prefix that is not the ID');

        expect(consoleLog.firstArg).to.equal('[not-the-id]');
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
    });

    it('stacks prefixes', () => {
        debug.enable();
        const child = debug.spawn('child', true);
        const grandchild = child.spawn('grandchild', true)

        grandchild.log('Stacked prefixes');

        expect(consoleLog.firstArg).to.equal('[child]');
        expect(consoleLog.args[0]).to.include.ordered.members(['[child]', '[grandchild]']);
    });

    it('accepts a config object to toggle instances individually', () => {
        // debug.enable();

        // const configExample = {
        //     LLZitateService: true,
        //     EuroEntscheidungenService: false,
        // }

        // debug.configure();
    });

    it('can decorate classes with a spawned "debug" property', () => {
        globalDebugInstance.enable();

        const dummyClassInstance = new DecoratedDummyClass();
        // expect(dummyClassInstance.debug).to.be.instanceOf(BasicDebugHelper);
        dummyClassInstance.poke();
        expect(consoleLog.firstArg).to.equal('[decorated]');
    })
});
