const CTRL_MIDDLE_GOALIE = {
    searchAngle: 0,
    execute(taken, controllers, fuzzy) {
        if(!taken.state.ball) {
            this.searchAngle = (this.searchAngle + 60) % 90;
            console.log("GOALIE MIDDLE searc angle=", this.searchAngle)
            return {n: 'turn', v: this.searchAngle};
        }
        return controllers[2].execute(taken, fuzzy);
    }
};

module.exports = CTRL_MIDDLE_GOALIE;
