const CTRL_LOW_GOALIE = {
    execute(taken, controllers, fuzzy) {
        const immediateAction = fuzzy.evaluateGoalie(taken.state);
        console.log("GOALIE LOW", immediateAction)
        return immediateAction || controllers[1].execute(taken, controllers, fuzzy);
    }
};

module.exports = CTRL_LOW_GOALIE;