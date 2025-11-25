// this is an integration test
// of importing a package with a name that overlaps with a builtin
// but rewritten to typescript with an truckload of type syntax
import eventsA from 'a';
import eventsB from 'b';
import type { EventEmitter } from 'events';

// Define types for the imported modules
type EventModule = EventEmitter & {
    once(event: string, listener: (...args: any[]) => void): EventModule;
    emit(event: string, ...args: any[]): boolean;
};

// Define the type for event handlers
type EventHandler = () => void;

// Define interface for the run function parameters
interface RunOptions {
    handleEventA: EventHandler;
    handleEventB: EventHandler;
}

/**
 * Runs the test by attaching event listeners and triggering events
 * @param options - Object containing event handlers
 * @returns {void}
 */
function run(options: RunOptions): void {
    const { handleEventA, handleEventB } = options;

    (eventsA as EventModule).once('hello', handleEventA);
    (eventsB as EventModule).once('hello', handleEventB);

    (eventsA as EventModule).emit('hello');
    (eventsB as EventModule).emit('hello');
}

function hiGenerator(name: string): EventHandler {
    return () => console.log(`hi from ${name}`);
}

// Call the run function with defined handlers
run({
    handleEventA: hiGenerator('a'),
    handleEventB: hiGenerator('b')
});