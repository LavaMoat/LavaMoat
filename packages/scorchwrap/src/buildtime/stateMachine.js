const EventEmitter = require("events");
const diag = require("./diagnostics");

/**
 * Add and remove listeners like with a regular EventEmitter. Use .transition(name) to trigger a state transition
 *
 *
 * @param {object} options
 * @param {Record<string,[string,string]>} options.transitions
 * @param {string} options.start
 * @returns {EventEmitter & { getState: () => string, transition: (transitionName: string) => void }}
 */
module.exports = function stateMachine({ transitions, start }) {
  let currentState = start;

  const API = new EventEmitter();

  const emit = API.emit.bind(API);
  API.emit = null;

  API.transition = (transitionName) => {
    const tr = transitions[transitionName];
    if (!tr) {
      throw Error(`Unknown transition name '${transitionName}'`);
    }
    if (tr[0] !== currentState) {
      throw Error(
        `Trying to transition '${transitionName}', but the current state is '${currentState}' not '${tr[0]}'.`
      );
    }
    currentState = tr[1];
    diag.rawDebug(0, `> state transition ${tr.join("=>")}`);

    emit(currentState);
  };
  API.getState = () => currentState;
  return API;
};
