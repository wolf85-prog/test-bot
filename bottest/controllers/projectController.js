require("dotenv").config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID

async function getProjects() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId
        });

        const responseResults = response.results.map((page) => {
            return {
               id: page.id,
               title: page.properties.Name.title[0]?.plain_text,
               time: page.properties.Date.date,
               time_start: page.properties.Date.date.start,
               time_created: page.created_time,
               geo: '',//page.properties.Address.rollup.array,
               teh: page.properties.TechClient.rich_text,
               status_id: page.properties.Status.select,
               manager: page.properties.Manager.relation[0]?.id,
               company: page.properties.Company.relation[0]?.id,
               worklist:'',
            };
        });

        return responseResults;
    } catch (error) {
        console.error(error.message)
    }
}

async function getProjects2() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId
        });

        return response;
    } catch (error) {
        console.error(error.message)
    }
}

async function getProjects3() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId
        });


        //const d = new Date(date.date.split('+')[0]);
        const d2 = new Date()

        const responseResults = response.results.filter((page) => new Date(page.properties.Date.date.start) > d2).map((page) => {
            //const d1 = new Date(page.properties.Date.date.start)
            //if (d1 > d2) {
                return {
                    id: page.id,
                    name: page.properties.Name.title[0]?.plain_text,
                    datestart: page.properties.Date.date.start,
                    crmID: page.properties.Crm_ID.rich_text[0]?.plain_text               
                };
            //}
        });

        return responseResults;
    } catch (error) {
        console.error(error.message)
    }
}

//получить все проекты менеджера по id
async function getProjectsId(managerId) {
    //console.log("managerId: ", managerId)
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            
            "filter": {
                "and": [
                    {
                        "property": "Manager",
                        "relation": {
                            "contains": managerId
                        },
                    },
                    {
                        // "property": "Date",
                        // "date": {
                        //     "after": "2023-05-31"
                        // }
                        "timestamp": "created_time",
                        "created_time": {
                            "after": "2023-05-31"
                        }
                    }
                ]
                
            },
            "sorts": [{ 
                "timestamp": "created_time", 
                "direction": "descending" 
            }]
        });

        //return response.results[0].id;

        const responseResults = response.results.map((page) => {
            return {
               id: page.id,
               title: page.properties.Name.title[0]?.plain_text,
               time: page.properties.Date.date,
               time_start: page.properties.Date.date.start,
               time_created: page.created_time,
               geo: '', //page.properties.Address.rollup.array,
               teh: page.properties.TechClient.rich_text,
               status_id: page.properties.Status.select,
               manager: page.properties.Manager.relation[0]?.id,
               company: page.properties.Company.relation[0]?.id,
               worklist:'',
            };
        });

        //console.log("Projects Data: "  + JSON.stringify(responseResults))
        return responseResults;
    } catch (error) {
        console.error(error.message)
    }
}


//получить проект по его id
async function getProjectId(projectId) {
    try {
        const response = await notion.pages.retrieve({
            page_id: projectId,           
        });

        //title: response.properties.Name.title[0]?.plain_text,  

        return response;
    } catch (error) {
        console.error(error.message)
    }
}


class ProjectController {
    
    async projects(req, res) {
        const projects = await getProjects();
        res.json(projects);
    }

    async projects2(req, res) {
        const projects = await getProjects2();
        res.json(projects);
    }

    async projects3(req, res) {
        const projects = await getProjects3();
        res.json(projects);
    }

    async projectsId(req, res) {
        const id = req.params.id; // получаем id
        const projects = await getProjectsId(id);
        if(projects){
            res.json(projects);
        }
        else{
            res.json([]);
        }
    }

    async projectId(req, res) {
        const id = req.params.id; // получаем id
        const project = await getProjectId(id);
        if(project){
            res.json(project);
        }
        else{
            res.json({});
        }
    }
}

module.exports = new ProjectController()