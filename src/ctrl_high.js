const FuzzyController = require('./fuzzy-controller');


const CTRL_HIGH = {
    execute(taken, fuzzy) {
        // Стратегическое позиционирование
		const act = fuzzy.positioning(taken.state);
		console.log("GOALIE HIGH act", act)
        return act
    }
}

module.exports = CTRL_HIGH;