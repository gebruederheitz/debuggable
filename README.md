# Debuggable

_Flexible debug output control for browser oder NodeJS applications._

---

## Installation

```shell
> npm i @gebruederheitz/debuggable
```

## Usage

The library exports a singleton object, which can be used directly, or to spawn
further child debuggers. While it's enabled (~~which is the default state~~) it will 
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
const childLogger = debug.spawn('childID', 'ChildNamespace');
childLogger.log('happy');

/*
-->> [ChildNamespace] happy

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

Instances can recursively spawn children of their own:

```js
const child = debug.spawn('child', 'Child');
const grandChild = child.spawn('grandchild', 'Grandchild');
const greatGrandChild = grandChild.spawn('greatgrandchild', 'Great-Grandchild');

greatGrandChild.log('Hi Grandpa!');

/*
-->> [Child] [Grandchild] [Great-Grandchild] Hi Grandpa!
 */

grancChild.disable();
greatGrandChild.log('**crickets**'); // no output, because disabled state is inherited
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


### IDs, Namespaces & Tagging

```ts
interface DebugHelper {
    spawn(
        id?: string,  // A unique identifier. Pass null to have 
                      // a UUIDv4 generated for you.
        namespace?: string, // The prefix for this instance, which will
                            // be prepended [in square brackets] along
                            // the prefixes of all ancestors.
        startsEnabled?: boolean, // Default true, pass false to initially
                                 // silence this instance.
        ...tags: string[]  // A list of tags to be associated with this
                           // instance. Can be used with configure()
                           // as shown below.
    ): DebugHelper;
    // ...
}
```

Another way to add tags is using the dedicated, chainable method:

```js
const child = debug.spawn('some-id').addTags('firstTag', 'secondTag');
```


### Runtime Configuration

You can toggle instances by their ID or assigned tags using the `configure()`
function on the global instance.

```js
debug.configure({
  tag: false,       // Will be disabled
  othertag: true,   // Will be enabled
  childId: true,
});
```


### Typescript Class Decorator

If you're using Typescript, you can use the decorator to automagically inject
a child instance as a class property. It will automatically inherit from the
debug instance on the parent class if it exists.

```ts
import { debug, DecoratedWithDebug } from '@gebruederheitz/debuggable';

// A little hack to communicate the additional property to Typescript
export interface MyDecoratedClass extends DecoratedWithDebug {}

@debug.decorate('id', 'tag', 'more-tags', '...')
class MyDecoratedClass {
    squawk() {
        this.debug.log('Quack!');
    }
}

new MyDecoratedClass().squawk();

// Automatic inheritance
@debug.decorate('child')
class MyChildClass extends MyDecoratedClass {}

const child = new MyChildClass();
child.squawk();

// -->> [id] [child] Quack!

MyDecoratedClass.prototype.debug.disable();
child.squawk();
// > silence
```


### Event Interface

The event interface is an instance of [mitt](https://npmjs.com/mitt) that is
exposed as a public property on the global instance.

```ts
import type { Events } from 'gebruederheitz/debuggable';
import type { Emitter } from 'mitt';

import { debug } from 'gebruederheitz/debuggable';

const eventInterface: Emitter<Events> = debug.events;

// Listen to events
eventInterface.on('register', ({instance, parent}: Events['register']) => {
    console.log('New instance has been spawned.', {
        newInstance: instance,
        parentInstance: parent,
    });
});

// Trigger events manually
eventInterface.emit('message', {
    type: 'log',
    instance: someDebugHelperInstance,
    message: ['Hello'],
});
eventInterface.emit('toggle_some-id', { enabled: false });
```


### On-Page Console (browser only)

This feature is particularly useful for debugging web applications on mobile
devices, particularly ones you might not have direct access to – i.e. whenever
using remote or USB debugging is impractical or impossible. Somewhere on the 
page running your scripts you'll insert an empty `div` element with the ID
attribute `debug-visualize`, and enable "visualisation" on the debug object.

Now the debugger will replicate any debug output into this "fake console"
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
    - NVM or [asdf](https://asdf-vm.com/guide/getting-started.html)


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
certain everything runs smoothly. You should also run `make test` at least once
to avoid simple linting issues and run the test suite.

When you're finished, you can use `make release` on the main branch to publish
your changes.
