const fetch = require("node-fetch");
const url = "https://28nlpo4r46.execute-api.us-east-1.amazonaws.com/test/questions?count=COUNT_NUMBER&mode=DIFFICULTY";

module.exports = {
     async getQuestions(count, difficulty) {
        try {
            let finalUrl = url.replace("COUNT_NUMBER", count).replace("DIFFICULTY", difficulty);
            console.log("******Inside Api Call******" + finalUrl);
            return new Promise(async function (resolve, reject) {

                const response = await fetch(finalUrl);
                const json = await response.json();
                //console.log(" Api response from node-fetch js "+ JSON.stringify(json));
                resolve(json);
            });
        } catch (error) {
            console.error(" Error while fetching question from node-fetch js file "+ error);
        }
     }
};