const CTRL_MIDDLE = {
    searchAngle: 0,
    execute(taken, controllers, fuzzy) {
        // 1. Если мяч не виден - поиск
        if (!taken.state.ball) {
            this.searchAngle = (this.searchAngle + 45) % 360;
            return { n: "turn", v: this.searchAngle };
        }
        
        // 2. Передача управления стратегическому позиционированию
        return controllers[2].execute(taken, fuzzy);
    }
};


module.exports = CTRL_MIDDLE;
