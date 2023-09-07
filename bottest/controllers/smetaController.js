require("dotenv").config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseSmetaId = process.env.NOTION_DATABASE_SMETA_ID

async function getSmeta() {
    try {
        const response = await notion.databases.query({
            database_id: databaseSmetaId
        });

        const responseResults = response.results.map((page) => {
            return {
               id: page.id,
               project: page.properties["Проект"].relation[0]?.id,
               final: page.properties["Финал. смета"].status.id,
               pre: page.properties["Пред. смета"].status.id,
            };
        });

        return responseResults;
    } catch (error) {
        console.error(error.message)
    }
}

class SmetaController {
    
    async smeta(req, res) {
        const smeta = await getSmeta();
        res.json(smeta);
    }

}

module.exports = new SmetaController()