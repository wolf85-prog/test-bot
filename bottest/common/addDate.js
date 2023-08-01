require("dotenv").config();
//notion api
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// текущая дата
//const dateNow = new Date();
//const date = dateNow.getFullYear() + "-0" + ((dateNow.getMonth())+1) + "-01T00:00:00.000"

//send data to notion
module.exports = async function addDate(blockId) {
    try {
        const response = await notion.blocks.update({
            "block_id": blockId,
            "to_do": {
                "text": [{ 
                  "text": { "content": "Предварительная смета" } 
                  }],
                "checked": true
              }
        })
        //console.log(response)
        console.log("Смета обновлена!") //+ JSON.stringify(response))
    } catch (error) {
        console.error(error.message)
    }
}