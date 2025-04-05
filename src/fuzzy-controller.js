const utils = require("./utils")

class FuzzyController {
    constructor() {

    }

    execute(taken){
        console.log(taken)
        return {n: "turn", v: 1}
    }

}

module.exports = FuzzyController;