const utils = require("./utils");

const CTRL_LOW_PLAYER = {
    execute(taken, controllers, fuzzy) {
        const action = fuzzy.evaluatePlayer(taken.state);
		console.log("PLAYER LOW", this.action )
        return action || controllers[1].execute(taken, controllers, fuzzy);
    }
};

module.exports = CTRL_LOW_PLAYER;