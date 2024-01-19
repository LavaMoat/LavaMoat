// COPIED FROM @types/node@20.8.9

declare module 'node:test' {
  interface MockFunctionOptions {
    /**
     * The number of times that the mock will use the behavior of
     * `implementation`. Once the mock function has been called `times` times,
     * it will automatically restore the behavior of `original`. This value must
     * be an integer greater than zero.
     *
     * @default Infinity
     */
    times?: number | undefined
  }
  interface MockMethodOptions extends MockFunctionOptions {
    /**
     * If `true`, `object[methodName]` is treated as a getter. This option
     * cannot be used with the `setter` option.
     */
    getter?: boolean | undefined
    /**
     * If `true`, `object[methodName]` is treated as a setter. This option
     * cannot be used with the `getter` option.
     */
    setter?: boolean | undefined
  }
  type Mock<F extends Function> = F & {
    mock: MockFunctionContext<F>
  }
  type NoOpFunction = (...args: any[]) => undefined
  type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? K : never
  }[keyof T]
  /**
   * The `MockTracker` class is used to manage mocking functionality. The test
   * runner module provides a top level `mock` export which is a `MockTracker`
   * instance. Each test also provides its own `MockTracker` instance via the
   * test context's`mock` property.
   *
   * @since V19.1.0, v18.13.0
   */
  class MockTracker {
    /**
     * This function is used to create a mock function.
     *
     * The following example creates a mock function that increments a counter
     * by one on each invocation. The `times` option is used to modify the mock
     * behavior such that the first two invocations add two to the counter
     * instead of one.
     *
     * ```js
     * test('mocks a counting function', (t) => {
     *   let cnt = 0;
     *
     *   function addOne() {
     *     cnt++;
     *     return cnt;
     *   }
     *
     *   function addTwo() {
     *     cnt += 2;
     *     return cnt;
     *   }
     *
     *   const fn = t.mock.fn(addOne, addTwo, { times: 2 });
     *
     *   assert.strictEqual(fn(), 2);
     *   assert.strictEqual(fn(), 4);
     *   assert.strictEqual(fn(), 5);
     *   assert.strictEqual(fn(), 6);
     * });
     * ```
     *
     * @since V19.1.0, v18.13.0
     * @param [original='A no-op function'] An optional function to create a
     *   mock on. Default is `'A no-op function'`
     * @param implementation An optional function used as the mock
     *   implementation for `original`. This is useful for creating mocks that
     *   exhibit one behavior for a specified number of calls and then restore
     *   the behavior of `original`.
     * @param options Optional configuration options for the mock function. The
     *   following properties are supported:
     * @returns The mocked function. The mocked function contains a special
     *   `mock` property, which is an instance of {@link MockFunctionContext},
     *   and can be used for inspecting and changing the behavior of the mocked
     *   function.
     */
    fn<F extends Function = NoOpFunction>(
      original?: F,
      options?: MockFunctionOptions
    ): Mock<F>
    fn<F extends Function = NoOpFunction, Implementation extends Function = F>(
      original?: F,
      implementation?: Implementation,
      options?: MockFunctionOptions
    ): Mock<F | Implementation>
    /**
     * This function is used to create a mock on an existing object method. The
     * following example demonstrates how a mock is created on an existing
     * object method.
     *
     * ```js
     * test('spies on an object method', (t) => {
     *   const number = {
     *     value: 5,
     *     subtract(a) {
     *       return this.value - a;
     *     },
     *   };
     *
     *   t.mock.method(number, 'subtract');
     *   assert.strictEqual(number.subtract.mock.calls.length, 0);
     *   assert.strictEqual(number.subtract(3), 2);
     *   assert.strictEqual(number.subtract.mock.calls.length, 1);
     *
     *   const call = number.subtract.mock.calls[0];
     *
     *   assert.deepStrictEqual(call.arguments, [3]);
     *   assert.strictEqual(call.result, 2);
     *   assert.strictEqual(call.error, undefined);
     *   assert.strictEqual(call.target, undefined);
     *   assert.strictEqual(call.this, number);
     * });
     * ```
     *
     * @since V19.1.0, v18.13.0
     * @param object The object whose method is being mocked.
     * @param methodName The identifier of the method on `object` to mock. If
     *   `object[methodName]` is not a function, an error is thrown.
     * @param implementation An optional function used as the mock
     *   implementation for `object[methodName]`.
     * @param options Optional configuration options for the mock method. The
     *   following properties are supported:
     * @returns The mocked method. The mocked method contains a special `mock`
     *   property, which is an instance of {@link MockFunctionContext}, and can
     *   be used for inspecting and changing the behavior of the mocked method.
     */
    method<
      MockedObject extends object,
      MethodName extends FunctionPropertyNames<MockedObject>,
    >(
      object: MockedObject,
      methodName: MethodName,
      options?: MockFunctionOptions
    ): MockedObject[MethodName] extends Function
      ? Mock<MockedObject[MethodName]>
      : never
    method<
      MockedObject extends object,
      MethodName extends FunctionPropertyNames<MockedObject>,
      Implementation extends Function,
    >(
      object: MockedObject,
      methodName: MethodName,
      implementation: Implementation,
      options?: MockFunctionOptions
    ): MockedObject[MethodName] extends Function
      ? Mock<MockedObject[MethodName] | Implementation>
      : never
    method<MockedObject extends object>(
      object: MockedObject,
      methodName: keyof MockedObject,
      options: MockMethodOptions
    ): Mock<Function>
    method<MockedObject extends object>(
      object: MockedObject,
      methodName: keyof MockedObject,
      implementation: Function,
      options: MockMethodOptions
    ): Mock<Function>

    /**
     * This function is syntax sugar for `MockTracker.method` with
     * `options.getter`set to `true`.
     *
     * @since V19.3.0, v18.13.0
     */
    getter<MockedObject extends object, MethodName extends keyof MockedObject>(
      object: MockedObject,
      methodName: MethodName,
      options?: MockFunctionOptions
    ): Mock<() => MockedObject[MethodName]>
    getter<
      MockedObject extends object,
      MethodName extends keyof MockedObject,
      Implementation extends Function,
    >(
      object: MockedObject,
      methodName: MethodName,
      implementation?: Implementation,
      options?: MockFunctionOptions
    ): Mock<(() => MockedObject[MethodName]) | Implementation>
    /**
     * This function is syntax sugar for `MockTracker.method` with
     * `options.setter`set to `true`.
     *
     * @since V19.3.0, v18.13.0
     */
    setter<MockedObject extends object, MethodName extends keyof MockedObject>(
      object: MockedObject,
      methodName: MethodName,
      options?: MockFunctionOptions
    ): Mock<(value: MockedObject[MethodName]) => void>
    setter<
      MockedObject extends object,
      MethodName extends keyof MockedObject,
      Implementation extends Function,
    >(
      object: MockedObject,
      methodName: MethodName,
      implementation?: Implementation,
      options?: MockFunctionOptions
    ): Mock<((value: MockedObject[MethodName]) => void) | Implementation>
    /**
     * This function restores the default behavior of all mocks that were
     * previously created by this `MockTracker` and disassociates the mocks from
     * the`MockTracker` instance. Once disassociated, the mocks can still be
     * used, but the`MockTracker` instance can no longer be used to reset their
     * behavior or otherwise interact with them.
     *
     * After each test completes, this function is called on the test
     * context's`MockTracker`. If the global `MockTracker` is used extensively,
     * calling this function manually is recommended.
     *
     * @since V19.1.0, v18.13.0
     */
    reset(): void
    /**
     * This function restores the default behavior of all mocks that were
     * previously created by this `MockTracker`. Unlike `mock.reset()`,
     * `mock.restoreAll()` does not disassociate the mocks from the
     * `MockTracker` instance.
     *
     * @since V19.1.0, v18.13.0
     */
    restoreAll(): void
    timers: MockTimers
  }
  const mock: MockTracker
  interface MockFunctionCall<
    F extends Function,
    ReturnType = F extends (...args: any) => infer T
      ? T
      : F extends abstract new (...args: any) => infer T
        ? T
        : unknown,
    Args = F extends (...args: infer Y) => any
      ? Y
      : F extends abstract new (...args: infer Y) => any
        ? Y
        : unknown[],
  > {
    /**
     * An array of the arguments passed to the mock function.
     */
    arguments: Args
    /**
     * If the mocked function threw then this property contains the thrown
     * value.
     */
    error: unknown | undefined
    /**
     * The value returned by the mocked function.
     *
     * If the mocked function threw, it will be `undefined`.
     */
    result: ReturnType | undefined
    /**
     * An `Error` object whose stack can be used to determine the callsite of
     * the mocked function invocation.
     */
    stack: Error
    /**
     * If the mocked function is a constructor, this field contains the class
     * being constructed. Otherwise this will be `undefined`.
     */
    target: F extends abstract new (...args: any) => any ? F : undefined
    /**
     * The mocked function's `this` value.
     */
    this: unknown
  }
  /**
   * The `MockFunctionContext` class is used to inspect or manipulate the
   * behavior of mocks created via the `MockTracker` APIs.
   *
   * @since V19.1.0, v18.13.0
   */
  class MockFunctionContext<F extends Function> {
    /**
     * A getter that returns a copy of the internal array used to track calls to
     * the mock. Each entry in the array is an object with the following
     * properties.
     *
     * @since V19.1.0, v18.13.0
     */
    readonly calls: Array<MockFunctionCall<F>>
    /**
     * This function returns the number of times that this mock has been
     * invoked. This function is more efficient than checking `ctx.calls.length`
     * because `ctx.calls`is a getter that creates a copy of the internal call
     * tracking array.
     *
     * @since V19.1.0, v18.13.0
     * @returns The number of times that this mock has been invoked.
     */
    callCount(): number
    /**
     * This function is used to change the behavior of an existing mock.
     *
     * The following example creates a mock function using `t.mock.fn()`, calls
     * the mock function, and then changes the mock implementation to a
     * different function.
     *
     * ```js
     * test('changes a mock behavior', (t) => {
     *   let cnt = 0;
     *
     *   function addOne() {
     *     cnt++;
     *     return cnt;
     *   }
     *
     *   function addTwo() {
     *     cnt += 2;
     *     return cnt;
     *   }
     *
     *   const fn = t.mock.fn(addOne);
     *
     *   assert.strictEqual(fn(), 1);
     *   fn.mock.mockImplementation(addTwo);
     *   assert.strictEqual(fn(), 3);
     *   assert.strictEqual(fn(), 5);
     * });
     * ```
     *
     * @since V19.1.0, v18.13.0
     * @param implementation The function to be used as the mock's new
     *   implementation.
     */
    mockImplementation(implementation: Function): void
    /**
     * This function is used to change the behavior of an existing mock for a
     * single invocation. Once invocation `onCall` has occurred, the mock will
     * revert to whatever behavior it would have used had
     * `mockImplementationOnce()` not been called.
     *
     * The following example creates a mock function using `t.mock.fn()`, calls
     * the mock function, changes the mock implementation to a different
     * function for the next invocation, and then resumes its previous
     * behavior.
     *
     * ```js
     * test('changes a mock behavior once', (t) => {
     *   let cnt = 0;
     *
     *   function addOne() {
     *     cnt++;
     *     return cnt;
     *   }
     *
     *   function addTwo() {
     *     cnt += 2;
     *     return cnt;
     *   }
     *
     *   const fn = t.mock.fn(addOne);
     *
     *   assert.strictEqual(fn(), 1);
     *   fn.mock.mockImplementationOnce(addTwo);
     *   assert.strictEqual(fn(), 3);
     *   assert.strictEqual(fn(), 4);
     * });
     * ```
     *
     * @since V19.1.0, v18.13.0
     * @param implementation The function to be used as the mock's
     *   implementation for the invocation number specified by `onCall`.
     * @param onCall The invocation number that will use `implementation`. If
     *   the specified invocation has already occurred then an exception is
     *   thrown.
     */
    mockImplementationOnce(implementation: Function, onCall?: number): void
    /**
     * Resets the call history of the mock function.
     *
     * @since V19.3.0, v18.13.0
     */
    resetCalls(): void
    /**
     * Resets the implementation of the mock function to its original behavior.
     * The mock can still be used after calling this function.
     *
     * @since V19.1.0, v18.13.0
     */
    restore(): void
  }
  type Timer = 'setInterval' | 'clearInterval' | 'setTimeout' | 'clearTimeout'
  /**
   * Mocking timers is a technique commonly used in software testing to simulate
   * and control the behavior of timers, such as `setInterval` and `setTimeout`,
   * without actually waiting for the specified time intervals.
   *
   * The `MockTracker` provides a top-level `timers` export which is a
   * `MockTimers` instance.
   *
   * @since V20.4.0
   * @experimental
   */
  class MockTimers {
    /**
     * Enables timer mocking for the specified timers.
     *
     * **Note:** When you enable mocking for a specific timer, its associated
     * clear function will also be implicitly mocked.
     *
     * Example usage:
     *
     * ```js
     * import { mock } from 'node:test';
     * mock.timers.enable(['setInterval']);
     * ```
     *
     * The above example enables mocking for the `setInterval` timer and
     * implicitly mocks the `clearInterval` function. Only the `setInterval`and
     * `clearInterval` functions from `node:timers`,`node:timers/promises`,
     * and`globalThis` will be mocked.
     *
     * Alternatively, if you call `mock.timers.enable()` without any parameters:
     *
     * All timers (`'setInterval'`, `'clearInterval'`, `'setTimeout'`, and
     * `'clearTimeout'`) will be mocked. The `setInterval`, `clearInterval`,
     * `setTimeout`, and `clearTimeout`functions from `node:timers`,
     * `node:timers/promises`, and `globalThis` will be mocked.
     *
     * @since V20.4.0
     */
    enable(timers?: Timer[]): void
    /**
     * This function restores the default behavior of all mocks that were
     * previously created by this `MockTimers` instance and disassociates the
     * mocks from the `MockTracker` instance.
     *
     * **Note:** After each test completes, this function is called on the test
     * context's `MockTracker`.
     *
     * ```js
     * import { mock } from 'node:test';
     * mock.timers.reset();
     * ```
     *
     * @since V20.4.0
     */
    reset(): void
    /**
     * Advances time for all mocked timers.
     *
     * **Note:** This diverges from how `setTimeout` in Node.js behaves and
     * accepts only positive numbers. In Node.js, `setTimeout` with negative
     * numbers is only supported for web compatibility reasons.
     *
     * The following example mocks a `setTimeout` function and by using `.tick`
     * advances in time triggering all pending timers.
     *
     * ```js
     * import assert from 'node:assert';
     * import { test } from 'node:test';
     *
     * test('mocks setTimeout to be executed synchronously without having to actually wait for it', (context) => {
     *   const fn = context.mock.fn();
     *
     *   context.mock.timers.enable(['setTimeout']);
     *
     *   setTimeout(fn, 9999);
     *
     *   assert.strictEqual(fn.mock.callCount(), 0);
     *
     *   // Advance in time
     *   context.mock.timers.tick(9999);
     *
     *   assert.strictEqual(fn.mock.callCount(), 1);
     * });
     * ```
     *
     * Alternativelly, the `.tick` function can be called many times
     *
     * ```js
     * import assert from 'node:assert';
     * import { test } from 'node:test';
     *
     * test('mocks setTimeout to be executed synchronously without having to actually wait for it', (context) => {
     *   const fn = context.mock.fn();
     *   context.mock.timers.enable(['setTimeout']);
     *   const nineSecs = 9000;
     *   setTimeout(fn, nineSecs);
     *
     *   const twoSeconds = 3000;
     *   context.mock.timers.tick(twoSeconds);
     *   context.mock.timers.tick(twoSeconds);
     *   context.mock.timers.tick(twoSeconds);
     *
     *   assert.strictEqual(fn.mock.callCount(), 1);
     * });
     * ```
     *
     * @since V20.4.0
     */
    tick(milliseconds: number): void
    /**
     * Triggers all pending mocked timers immediately.
     *
     * The example below triggers all pending timers immediately, causing them
     * to execute without any delay.
     *
     * ```js
     * import assert from 'node:assert';
     * import { test } from 'node:test';
     *
     * test('runAll functions following the given order', (context) => {
     *   context.mock.timers.enable(['setTimeout']);
     *   const results = [];
     *   setTimeout(() => results.push(1), 9999);
     *
     *   // Notice that if both timers have the same timeout,
     *   // the order of execution is guaranteed
     *   setTimeout(() => results.push(3), 8888);
     *   setTimeout(() => results.push(2), 8888);
     *
     *   assert.deepStrictEqual(results, []);
     *
     *   context.mock.timers.runAll();
     *
     *   assert.deepStrictEqual(results, [3, 2, 1]);
     * });
     * ```
     *
     * **Note:** The `runAll()` function is specifically designed for triggering
     * timers in the context of timer mocking. It does not have any effect on
     * real-time system clocks or actual timers outside of the mocking
     * environment.
     *
     * @since V20.4.0
     */
    runAll(): void
    /**
     * Calls {@link MockTimers.reset()}.
     */
    [Symbol.dispose](): void
  }

  export {
    MockFunctionOptions,
    MockMethodOptions,
    Mock,
    MockTracker,
    mock,
    MockFunctionCall,
    MockFunctionContext,
    Timer,
    MockTimers,
  }
}
