const CTRL_MIDDLE = {
    searchAngle: 0,
    execute(taken, controllers, fuzzy) {
        if (!taken.state.ball) {
            this.searchAngle = (this.searchAngle + 20) % 360;
            return {n: "turn", v: this.searchAngle, d: 30};
        }
        return controllers[2].execute(taken, fuzzy);
    }
};


module.exports = CTRL_MIDDLE;
