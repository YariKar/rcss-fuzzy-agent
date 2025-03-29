const CTRL_LOW = {
    execute(taken, controllers, fuzzy) {
        // 1. Проверка на возможность немедленного действия
        const action = fuzzy.evaluate(taken.state);
        if (action) return action;
        
        // 2. Передача управления следующему уровню
        return controllers[1].execute(taken, controllers, fuzzy);
    }
};

module.exports = CTRL_LOW;