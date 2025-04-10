import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';

import {
    DecoratedDummyClass,
    DecoratedDummyChild,
    globalDebugInstance as fixtureGlobalDebugInstance,
} from './fixtures/build/node/test/fixtures/index.fixture.js';

describe('The debuggable library', () => {
    let consoleLog;
    let debug;

    beforeEach(async () => {
        const m = await import('../dist/index.mjs');
        debug = m.debug;

        consoleLog = vi
            .spyOn(global.console, 'log')
            .mockImplementation(vi.fn());
    });

    afterEach(function () {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should not display console output by default', () => {
        const child = debug.spawn('child disabled');

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog).not.toHaveBeenCalled();
    });

    it('should display console output when debugging is enabled', () => {
        debug.enable();
        const child = debug.spawn('child');

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog).toHaveBeenCalledTimes(2);
    });

    it('should not display console output when debugging is disabled', () => {
        debug.enable();
        const child = debug.spawn('child disabled');

        child.log('Hello');

        debug.disable();

        child.log('Hello');
        child.log('Goodbye');

        expect(consoleLog).toHaveBeenCalledTimes(1);
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

        expect(consoleLog).toHaveBeenCalledTimes(2);
    });

    it('can spawn instances that start disabled', () => {
        debug.enable();
        const activeChild = debug.spawn('activeChild', true, false);
        const silentChild = debug.spawn('silentChild', true);

        activeChild.log('Hello');
        activeChild.log('Goodbye');
        silentChild.log('Hello');
        silentChild.log('Goodbye');

        expect(consoleLog).toHaveBeenCalledTimes(2);
    });

    it('applies global scope to all children', () => {
        debug.disable();
        const child = debug.spawn();
        child.enable();

        child.log('Hello');

        expect(consoleLog).not.toHaveBeenCalled();
    });

    it('prefixes child output', () => {
        debug.enable();
        const child = debug.spawn('child', true);

        child.log('Prefixed');

        expect(consoleLog.mock.lastCall[0]).toBe('[child]');
    });

    it('can use a class name as an id and prefix when passed an object', () => {
        debug.enable();
        const object = new (class FixtureDummyClass {})();
        const child = debug.spawn(object, true);

        child.log('Prefixed');

        expect(consoleLog.mock.lastCall[0]).toBe('[FixtureDummyClass]');
    });

    it('can skip prefixing', () => {
        debug.enable();
        const child = debug.spawn();

        child.log('Not Prefixed');

        expect(consoleLog.mock.lastCall[0]).toBe('Not Prefixed');
    });

    it('can have a custom prefix', () => {
        debug.enable();
        const child = debug.spawn('child', 'not-the-id');

        child.log('Prefix that is not the ID');

        expect(consoleLog.mock.lastCall[0]).toBe('[not-the-id]');
    });

    it('allows recursion', () => {
        debug.enable();

        const child = debug.spawn('child', true);
        const grandchild = child.spawn('grandchild', true);
        const greatGrandchild = grandchild.spawn('greatgrandchild', true);

        // These three should all be displayed
        child.log('hi daddy');
        grandchild.log('hi granddad');
        greatGrandchild.log('hi great-granddaddy');

        expect(consoleLog).toHaveBeenCalledTimes(3);
    });

    it('passes status down the tree when recurring', () => {
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

        expect(consoleLog).toHaveBeenCalledTimes(4);
    });

    it('stacks prefixes', () => {
        debug.enable();
        const child = debug.spawn('child', true);
        const grandchild = child.spawn('grandchild', true);

        grandchild.log('Stacked prefixes');

        expect(consoleLog.mock.lastCall[0]).toBe('[child]');
        expect(consoleLog.mock.lastCall).to.include.ordered.members([
            '[child]',
            '[grandchild]',
        ]);
    });

    it('accepts a config object to toggle instances individually', () => {
        debug.enable();

        const configExample = {
            first: false,
            second: true,
        };

        const firstParent = debug.spawn('parent');
        const first = firstParent.spawn('first');
        const firstChild = first.spawn('child');
        const second = debug.spawn('second').disable();

        debug.configure(configExample);

        first.log('hello');
        firstChild.log('hello');
        second.log('hello');

        first.enable();
        firstChild.log('hello');

        expect(consoleLog).toHaveBeenCalledTimes(2);
    });

    it('allows overriding the base configuration', () => {
        debug.enable();

        const child = debug.spawn('child').disable();
        debug.configure({ child: true });

        // on
        child.log('hello');
        expect(consoleLog).toHaveBeenCalledTimes(1);

        child.disable();
        // off
        child.log('hello');

        expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it('can use tags to enable or disable instances', () => {
        debug.enable();

        const firstChild = debug.spawn(
            'child1',
            true,
            true,
            'willBeDisabled',
            'tag1'
        );
        const secondChild = debug
            .spawn('child2')
            .addTags('willBeReEnabled', 'willBeDisabled');
        const thirdChild = debug.spawn('child3', true, true, 'tag3');

        debug.configure({
            willBeDisabled: false,
        });

        firstChild.log('silence');
        secondChild.log('silence');
        thirdChild.log('noise');

        debug.configure({
            willBeReEnabled: true,
        });

        firstChild.log('silence');
        secondChild.log('noise');

        expect(consoleLog).toHaveBeenCalledTimes(2);
    });

    it('exposes an event interface', () => {
        debug.enable();

        const spy = sinon.spy();
        debug.events.on('message', spy);

        const child = debug.spawn();
        child.log('hello');

        expect(spy.calledOnce).to.be.true;
        expect(
            spy.calledWith({
                message: ['hello'],
                type: 'log',
                instance: child,
            })
        ).to.be.true;

        debug.events.emit('toggle_' + child.id, { enabled: false });
        child.log('silent');

        expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it('can decorate classes with a spawned "debug" property', () => {
        fixtureGlobalDebugInstance.enable();

        const dummyClassInstance = new DecoratedDummyClass();

        expect(DecoratedDummyClass.prototype).to.haveOwnProperty('debug');

        dummyClassInstance.poke();
        expect(consoleLog.mock.lastCall[0]).toBe('[decorated]');

        fixtureGlobalDebugInstance.configure({ tag: false });
        dummyClassInstance.poke();
        expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it('can decorate child classes', () => {
        fixtureGlobalDebugInstance.enable();

        const dummyClassInstance = new DecoratedDummyChild();

        expect(DecoratedDummyChild.prototype).to.haveOwnProperty('debug');

        // @FIXME: somehow move the fixtures to the sandbox: the enabled state
        //         from the previous test on the parent carries into this run
        fixtureGlobalDebugInstance.configure({ tag: true });

        dummyClassInstance.poke();
        expect(consoleLog.mock.lastCall)
            .to.include('[decorated]')
            .and.to.include('[grandchild]');

        expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it("can use the console's grouping feature when it is available and enabled", () => {
        const group = vi
            .spyOn(global.console, 'group')
            .mockImplementation(vi.fn());
        const groupEnd = vi
            .spyOn(global.console, 'groupEnd')
            .mockImplementation(vi.fn());

        debug
            .enable()
            .configure(null, {
                grouped: true,
            })
            .spawn(null, 'test')
            .log('test');

        expect(group).toHaveBeenCalledTimes(1);
        expect(groupEnd).toHaveBeenCalledTimes(1);
        expect(consoleLog).toHaveBeenCalledTimes(1);
    });

    it('stacks prefixes in grouped output', () => {
        const group = vi
            .spyOn(global.console, 'group')
            .mockImplementation(vi.fn());

        debug
            .enable()
            .configure(null, { grouped: true })
            .spawn(null, 'parent')
            .spawn(null, 'child')
            .log('test');

        expect(consoleLog).toHaveBeenCalledTimes(1);
        expect(group).toHaveBeenCalledTimes(1);
        expect(group.mock.lastCall)
            .to.include('[parent]')
            .and.to.include('[child]');
    });

    it('allows to use dotted prefix stacking instead of square brackets', () => {
        debug
            .enable()
            .configure(null, {
                dotted: true,
            })
            .spawn('child', true)
            .spawn('grandchild', true)
            .log('Dotted and bracketed');

        const options = debug.getOptions();
        expect(options).to.haveOwnProperty('dotted');
        expect(debug.options.dotted).to.be.true;
        expect(debug.options.grouped).to.be.false;

        expect(consoleLog.mock.lastCall[0]).toBe('[child.grandchild]');
    });

    it('allows dotted prefix stacking in grouped output', () => {
        const group = vi.spyOn(global.console, 'group');

        debug.enable().configure(null, {
            dotted: true,
            grouped: true,
        });
        debug
            .spawn('child', true)
            .spawn('grandchild', true)
            .log('Dotted group');

        expect(group.mock.lastCall[0]).toBe('child.grandchild');
    });

    it('can use warn and error outputs', () => {
        const warn = vi
            .spyOn(global.console, 'warn')
            .mockImplementation(vi.fn());
        const error = vi
            .spyOn(global.console, 'error')
            .mockImplementation(vi.fn());
        debug.enable();
        const logger = debug.spawn();

        logger.warn('test');
        logger.error('test');

        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);
    });
});
