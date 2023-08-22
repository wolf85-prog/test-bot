require("dotenv").config();
//notion api
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });

//получить id всех проектов
module.exports = async function getAllProjects() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId
        });

        const responseResults = response.results.map((page) => {
            return {
                id: page.id,
            };
        });

        return responseResults;
    } catch (error) {
        console.error(error.message)
    }
}