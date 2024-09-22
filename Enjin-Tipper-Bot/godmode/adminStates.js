const ADMIN_STATES = {
    NONE: 0,
    AWAITING_BROADCAST: 1,
    AWAITING_SEARCH: 2,
    AWAITING_TOKEN_DROP_MESSAGE: 3, // Add a new state for awaiting token drop message
};

const adminState = {
    current: ADMIN_STATES.NONE, // Initialize the state
    awaitingTokenDropMessage: '', // Initialize a variable to store the token drop message
};

module.exports = { ADMIN_STATES, adminState };