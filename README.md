# Debuggable

_Flexible debug output for browser applications._

---

## Installation

```shell
> npm i @gebruederheitz/debuggable
```

## Usage

The library exports a singleton object, which can be used directly, or to spawn
further child debuggers. While it's enabled (which is the default state) it will 
simply proxy its arguments through to `console`. Currently implemented are the 
methods `log()`, `warn()` and `error()`.

```js
import { debug } from '@gebruederheitz/debuggable';

const object = 'world';
debug.log('Hello %s.', object); // Will print "Hello world." to the browser console.

debug.disable(); // You could alternatively use `debug.toggle(false);`
debug.log('Goodbye!') // Will now not output anything.
```

### Spawing children and using namespaces

Namespaces make it easier to identify where a particular log message came from.
They also allow filtering the console for messages from a particular component
quite simply.

```js
const childLogger = debug.spawn('child');
childLogger.log('happy');

/*
-->> [child] happy

 */
```


Child debuggers are disabled and enabled with their parent, while maintaining
their internal state. This sounds more complicated than it is:

```js
const child = debug.spawn('child');
child.log('something') // logs something

child.disable();
child.log('something') // doesn't log anything, because "locally disabled"

debug.disable();
child.enable();
child.log('something') // doesn't log anything, because globally disabled

debug.enable();
child.log('something') // logs something
```


Here's some example usage with ES classes, each using their own child instance:

```js
import { debug } from '@gebruederheitz/debuggable';

class MyModule {
    constructor() {
        this.debug = debug.spawn('MyModule');
    }
    
    someMethod(arg) {
        this.debug.log('User has called someMethod with', arg);
    }
    
    quiet() {
        this.debug.disable();
    }
}

class OtherModule {
    constructor() {
        this.debug = debug.spawn('OtherModule');
    }
    
    otherMethod() {
        this.debug.log('otherMethod has been called!');
    }
}

const x = new MyModule();
const y = new OtherModule();
x.someMethod('someArg');
y.otherMethod();

x.quiet();
x.someMethod('otherArg'); // no output
y.otherMethod();

debug.disable();
x.someMethod(42); // no output
y.otherMethod(); // no output
```

Resulting output:

```
>> [MyModule] User has called someMethod with someArg
>> [OtherModule] otherMethod has been called!
>> [OtherModule] otherMethod has been called!
```


### On-Page Console

This feature is particularly useful for debugging web applications on mobile
devices, particularly ones you might not have direct access to – i.e. whenever
using remote or USB debugging is impractical or impossible. Somewhere on the 
page running your scripts you'll insert an empty `div` element with the ID
attribute `debug-visualize`, and enable "visualisation" on the debug object.

Now the debugger will replicate any console output into this "fake console"
element, allowing you to read your app's debug messages without access to the
browser console. Obviously this is not suitable for production use.

```html
<div id="debug-visualize"></div>
```

```js
debug.toggleVisualization(true);
// Use toggleVisualization(false) to turn it back off again
debug.spawn('Test').log('Hello!');
```

```html
<div id="debug-visualize" style="...">
  <div class="console" style="...">
    <code class="debug-visualize__entry debug-visualize__entry--log" style="...">
      [Test] Hello!
    </code>
  </div>
</div>
```


### Helpers & Utilities


#### `timeout()`

I sometimes use this to simulate any asynchronous action, like a network request
that might take a while. It simply wraps the native `setTimeout()` in a Promise
and returns that, so it's a convenient one-liner in an async flow:

```js
async function getDataFromApi() {
    // @TODO: write actual API request once backend team is ready
    await debug.timeout(1200) // Wait for 1.2 seconds to simulate a request
  
    return {
        success: true,
        data: {
            items: [],
        },
    };
}
```

#### `devnull()`

Slightly silly, but I found it useful during development to just shut the 
linters up (and especially TS) while I'm working with method stubs. Maybe 
there's more or even better uses for this:

```js
class MyClass {
    methodStub(knownArg) {
        // It simply returns the args passed to it. Nothing else.
        this.debug.devnull(knownArg);
    }
}

```

## Development


### Dependencies

- nodeJS LTS (18.x)
- nice to have:
    - GNU make or drop-in alternative
    - NVM

### Quickstart

You can use the watch task:
```shell
$> nvm use
$> npm run watch
# or
$> make
# or, more explicitly
$> make dev
```

After making your changes, run
```shell
$> npm run build
# or
$> make build
```
to create the ES-module build at `dist/index.mjs` and make 
certain everything runs smoothly. You should also run `make lint` at least once
to avoid simple linting issues.

When you're finished, you can use `make release` on the main branch to publish
your changes.
