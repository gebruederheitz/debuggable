import fs from 'fs';
import path from 'path';

import { Browser } from 'happy-dom';
import { expect } from 'chai';
import sinon from 'sinon';

// import { debug } from '../dist/index.mjs'

describe('The debuggable visualizer module', function () {
    const sandbox = sinon.createSandbox();
    let page;
    let browser;
    let consoleLog;
    let doc;

    beforeEach(() => {
        browser = new Browser();
        page = browser.newPage();
        page.content = fs.readFileSync(
            path.resolve('./test/fixtures/dom-visualize.fixture.html'),
            'utf-8'
        );
        consoleLog = sinon.replace(
            page.console,
            'log',
            sinon.spy(page.console.log)
            // sinon.spy((...content) => { console.log(...content); })
        );

        doc = page.mainFrame.document;
    });

    afterEach(async () => {
        await browser.close();
        sandbox.restore();
    });

    it('runs tests', () => {
        expect(page).to.exist;
        expect(doc).to.exist;
        expect(doc.querySelector('#btn')).to.exist;
    });

    it('logs to console', async () => {
        await page.waitUntilComplete();

        loadFixtureScript('dom-visualize.fixture.js');
        await page.waitUntilComplete();

        expect(consoleLog.callCount).to.equal(1);
        expect(consoleLog.args.flat()).to.include('INIT');

        doc.querySelector('#btn').click();

        expect(consoleLog.args.flat()).to.include('Click!');
    });

    it('appends entries to visualizer', async () => {
        await page.waitUntilComplete();
        const viz = doc.querySelector('#debug-visualize');
        loadFixtureScript('dom-visualize.fixture.js');
        await page.waitUntilComplete();
        doc.querySelector('#btn').click();

        expect(viz.textContent).to.contain('Click!');
    });

    function loadFixtureScript(browserFixtureFile) {
        page.mainFrame.evaluate(
            fs.readFileSync(
                path.resolve(`./test/fixtures/build/browser/${browserFixtureFile}`),
                'utf-8'
            )
        );
    }
});
