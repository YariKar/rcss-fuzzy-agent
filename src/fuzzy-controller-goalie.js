const utils = require("./utils")

class FuzzyControllerGoalie {
    constructor() {

    }

    execute(taken){
        console.log(taken)
        return {n: "turn", v: -1}
    }

}

module.exports = FuzzyControllerGoalie;