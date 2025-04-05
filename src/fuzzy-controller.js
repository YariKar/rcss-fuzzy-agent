const utils = require("./utils")
const calculations = require("./calculations");
const actions = require("./actions");

class FuzzyController {
    constructor() {

        this.assumedKnowValue = 3;

        this.variables = {
            ballKnowledge: {
                known: 0, assumed: 0, unknown: 0
            },
            posKnowledge: {
                known: 0, assumed: 0, unknown: 0
            },
            ballDistance: {
                close: 0, near: 0, far: 0
            }
        };

    }

    // Расчет функции принадлежности для переменной
    calcMF(varName, value) {
        const result = {};
        const variable = this.variables[varName];
        for (const term of variable.terms) {
            result[term] = variable.mf[term](value);
        }
        return result;
    }

    // Функции принадлежности для знания о мяче
    ballKnowledgeMF(taken) {
        if (taken.state && taken.state.ball) {
            return { known: 1, assumed: 0, unknown: 0 };
        }

        if (taken?.last_ball_pos?.ball && taken.last_ball_pos.tact_count <= this.assumedKnowValue) {
            const decay = 1 - (taken.last_ball_pos.tact_count / this.assumedKnowValue);
            return { known: 0, assumed: decay, unknown: 1 - decay };
        }

        return { known: 0, assumed: 0, unknown: 1 };
    }

    // Функции принадлежности для знания о позиции
    posKnowledgeMF(taken) {
        if (taken.state.pos) {
            return { known: 1, assumed: 0, unknown: 0 };
        }

        if (taken.last_pos && taken.last_pos.pos && taken.last_pos.tact_count <= this.assumedKnowValue) {
            const decay = 1 - (taken.last_pos.tact_count / this.assumedKnowValue);
            return { known: 0, assumed: decay, unknown: 1 - decay };
        }

        return { known: 0, assumed: 0, unknown: 1 };
    }

    calculateMatchFunctionValues(taken) {
        this.variables.ballKnowledge = this.ballKnowledgeMF(taken)
        this.variables.posKnowledge = this.posKnowledgeMF(taken)
        //TODO
    }

    rulesHadler(taken) {

        
        if (this.variables.ballKnowledge.unknown >= 0.8 || this.variables.posKnowledge.unknown >= 0.8) {
            //this.lastAction = this.positioningAction(taken);
            console.log("UNKNOWN", this.variables.ballKnowledge, this.variables.posKnowledge);
            return actions.positioning(taken)
        }
        if (this.variables.ballKnowledge.assumed >= 0.4 || this.variables.ballKnowledge.assumed >= 0.4) {
            if (taken.last_act) {
                console.log("ASSUMED", this.variables.ballKnowledge, this.variables.posKnowledge);
                return taken.last_act;
            }
            return actions.positioning(taken)
        }




        // Заглушка для "знает" - можно добавить другую логику
        console.log("KNOW", this.variables.ballKnowledge, this.variables.posKnowledge);
        return [{ n: "turn", v: 10 }, { n: "dash", v: 100 }];
    }


    execute(taken) {
        console.log(taken)
        this.calculateMatchFunctionValues(taken)
        return this.rulesHadler(taken)
    }

}

module.exports = FuzzyController;