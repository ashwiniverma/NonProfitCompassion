const fetch = require("node-fetch");
const { URLSearchParams } = require('url');
const url = "http://52.53.126.9:7080/get_profinity";

module.exports = {
     async getCleanTranslation(phrase, from, to) {
        try {
            let finalUrl = url;
            console.log("******Inside Api Call******" + finalUrl + " PHRASE= " + phrase);

            const params = new URLSearchParams();
            params.append('text', "This is working");

            const body = "{\"text\": \""+ phrase +"\", \"from\": \""+ from +"\" }";

            return new Promise(async function (resolve, reject) {

                const response = await fetch("http://52.53.126.9:7080/get_profinity", {method: 'post', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }});
                const json = await response.json();
                console.log(" Api response from node-fetch js "+ JSON.stringify(json));
                resolve(json);
            });
        } catch (error) {
            console.error(" Error while fetching question from node-fetch js file "+ error);
        }
     }
};
