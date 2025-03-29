const CTRL_LOW = {
    execute(taken, controllers, fuzzy) {
        const immediateAction = fuzzy.evaluate(taken.state);
        if (immediateAction) {
			console.log("GOALIE LOW act ", immediateAction)
			return immediateAction;
		}
        // Если мяча нет, передаём управление CTRL_MIDDLE
        return controllers[1].execute(taken, controllers, fuzzy);
    }
}

module.exports = CTRL_LOW;