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
        const response = await notion.pages.create({
            parent: { database_id: blockId },
            children: [              
                {
                    "object": "block",
                    "type": "column_list",
                    "column_list": {
                      "children": [
                        {
                          "object": "block",
                          "type": "column",
                          "column": {
                            "children": [
                                {
                                    "object": "block",
                                    "type": "to_do",
                                    "to_do": {
                                      "rich_text": [{
                                        "type": "text",
                                        "text": {
                                          "content": "Предварительная смета",
                                          "link": null
                                        }
                                      }],
                                      "checked": true,
                                      "color": "green",
                                    }
                                },
                                {
                                    "object": "block",
                                    "type": "to_do",
                                    "to_do": {
                                      "rich_text": [{
                                        "type": "text",
                                        "text": {
                                          "content": "Постер",
                                          "link": null
                                        }
                                      }],
                                      "checked": false,
                                      "color": "purple",
                                    }
                                },
                            ]
                          }
                        },
                        {
                          "object": "block",
                          "type": "column",
                          "column": {
                            "children": [
                                {
                                    "object": "block",
                                    "type": "to_do",
                                    "to_do": {
                                      "rich_text": [{
                                        "type": "text",
                                        "text": {
                                          "content": "Калькулятор",
                                          "link": null
                                        }
                                      }],
                                      "checked": false,
                                      "color": "blue",
                                    }
                                },
                                {
                                    "object": "block",
                                    "type": "to_do",
                                    "to_do": {
                                      "rich_text": [{
                                        "type": "text",
                                        "text": {
                                          "content": "Финальная смета",
                                          "link": null
                                        }
                                      }],
                                      "checked": false,
                                      "color": "pink",
                                    }
                                },
                            ]
                          }
                        }
                    ]
                    }
                },
            ]
        })
        //console.log(response)
        console.log("Смета обновлена!") //+ JSON.stringify(response))
    } catch (error) {
        console.error(error.message)
    }
}