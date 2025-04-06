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
            },
            teamPositioning: {
                closer: 0, equal: 0, farther: 0
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

    ballDistanceMF(taken) {
        console.log("BALL DISTANSE", taken.state.pos, taken.state.ball)
        const CLOSE_MAX = 0.7
        const CLOSE_MIN = 1.7
        const NEAR_MAX = 25
        const NEAR_MIN = 30
        const ballDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball)
        return {
            close: calculations.trapezoidMF(ballDist, [0, 0, CLOSE_MAX, CLOSE_MIN]),
            near: calculations.trapezoidMF(ballDist, [CLOSE_MAX, CLOSE_MIN, NEAR_MAX, NEAR_MIN]),
            far: calculations.trapezoidMF(ballDist, [NEAR_MAX, NEAR_MIN, 100, 100])
        };

    }

    teamPositioningMF(taken) {
        console.log("TEAM POS", taken.state.myTeam)
        const CLOSER_MAX = 1 
        const EQUAL_MIN =  1   
        const EQUAL_MAX = 3
        const FARTHER_MIN = 3  
        const selfDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball);
        let closerCount  = 0;
        taken.state?.myTeam.forEach(teammate => {
            console.log("TEAMMATE", teammate, taken.state.ball)
            if (calculations.distance(teammate, taken.state.ball) < selfDist) {
                closerCount++
            }
        });
        return {
            closer: calculations.trapezoidMF(closerCount, [-1, -1, 0, CLOSER_MAX]),
            equal: calculations.trapezoidMF(closerCount, [
              EQUAL_MIN - 1,
              EQUAL_MIN,
              EQUAL_MAX,
              EQUAL_MAX + 1
            ]),
            farther: calculations.trapezoidMF(closerCount, [
              FARTHER_MIN - 1,
              FARTHER_MIN,
              11, 11 // Макс 10 игроков
            ])
          };
    }

    calculateKnowMatchFunctionValues(taken) {
        this.variables.ballKnowledge = this.ballKnowledgeMF(taken)
        this.variables.posKnowledge = this.posKnowledgeMF(taken)
    }

    rulesHadler(taken) {

        console.log("BALL KNOWLEDGE", this.variables.ballKnowledge)
        console.log("POS KNOWLEDGE", this.variables.posKnowledge)
        if (this.variables.ballKnowledge.unknown >= 0.8 || this.variables.posKnowledge.unknown >= 0.8) {
            //this.lastAction = this.positioningAction(taken);
            console.log("UNKNOWN", this.variables.ballKnowledge, this.variables.posKnowledge);
            return actions.positioning(taken)
        }
        if (this.variables.ballKnowledge.assumed >= 0.3 || this.variables.ballKnowledge.assumed >= 0.3) {
            if (taken.last_act) {
                console.log("ASSUMED", this.variables.ballKnowledge, this.variables.posKnowledge);
                return taken.last_act;
            }
            return actions.positioning(taken)
        }

        this.variables.ballDistance = this.ballDistanceMF(taken)
        this.variables.teamPositioning = this.teamPositioningMF(taken)
        console.log("BALL DISTANSE RESULT", this.variables.ballDistance)
        console.log("TEAM POS RESULT", this.variables.teamPositioning)


        if (this.variables.ballDistance.far > 0.8){
            console.log("BALL FAR: positioning", this.variables.ballDistance)
            return actions.positioning(taken)
        }
        if (this.variables.ballDistance.near>= 0.3){
            console.log("BALL NEAR: move", this.variables.ballDistance)
            return actions.moveToBall(taken)
        }
        if (this.variables.ballDistance.close>=0.7){
            console.log("BALL CLOSE: kick", this.variables.ballDistance)
            return {n: "kick", v: "100 "+(-taken.state.ball?.angle)}
        }

        // Заглушка для "знает" - можно добавить другую логику
        console.log("ANOTHER", this.variables.ballKnowledge, this.variables.posKnowledge);
        return { n: "turn", v: 0 };
    }


    execute(taken) {
        console.log(taken)
        this.calculateKnowMatchFunctionValues(taken)
        return this.rulesHadler(taken)
    }

}

module.exports = FuzzyController;