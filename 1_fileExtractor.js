let minimist  = require("minimist");
let axios  = require("axios");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let jsdom  = require("jsdom");
let fs = require("fs");
let path = require("path");
const { colorScheme } = require("excel4node/distribution/lib/types");

// node 1_fileExtractor.js --excel=WorldCup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let args = minimist(process.argv);

// download using axios

let responseKaPromise = axios.get(args.source);
let matches = [];

responseKaPromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document  = dom.window.document;
    let matchInfoDivs = document.querySelectorAll("div.match-score-block");

    

for(let i = 0;i<matchInfoDivs.length;i++){
    let match = {};
    let tname = matchInfoDivs[i].querySelectorAll("p.name"); 
    match.t1 = tname[0].textContent;
    match.t2 = tname[1].textContent;
    let scores = matchInfoDivs[i].querySelectorAll("span.score");
    match.s1 = "";
    match.s2 = "";
    if(scores.length == 2){
        match.s1 = scores[0].textContent;
        match.s2 = scores[1].textContent;
    }else if(colorScheme.length==1){
        match.s1 = scores[0].textContent;
    }
    match.result = matchInfoDivs[i].querySelector("div.status-text").textContent;
    matches.push(match);
}

let teams = [];

for(let i=0;i<matches.length;i++){
    putMatchIndex(teams,matches[i]);
}

for(let i=0;i<matches.length;i++){
    putMatchInteams(teams,matches[i]);
}

let teamsJSON = JSON.stringify(teams);
fs.writeFileSync("teams.json",teamsJSON,"utf-8");

//createExcelFile(teams);
createFolders(teams);


}).catch(function(err){
    console.log(err);
})

function putMatchIndex(teams,match){
    let t1idx = -1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }
    
    if(t1idx == -1){
        teams.push({
            name: match.t1,
            matches: []
        });
    }

    let t2idx = -1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    
    if(t2idx == -1){
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

function createFolders(teams) {
    let dataDir = args.dataFolder;
    if(fs.existsSync(dataDir) == false){
        fs.mkdirSync(dataDir);
    }

    
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        if(fs.existsSync(teamFN)==false){
            fs.mkdirSync(teamFN);
        }
        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            let match = teams[i].matches[j];
            let homeTeam = teams[i].name;
            createScoreCard(matchFileName,match,homeTeam);
        }
    }
}


function createScoreCard(matchFileName,match,homeTeam){
    let templateFileBytes =  fs.readFileSync("template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(templateFileBytes);
    pdfdocKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);

        page.drawText(homeTeam, {
            x: 320,
            y: 700,
            size: 12
        });
        page.drawText(match.vs, {
            x: 320,
            y: 675,
            size: 12
        });
        page.drawText(match.selfScore, {
            x: 320,
            y: 650,
            size: 12
        });
        page.drawText(match.oppScore, {
            x: 320,
            y: 625,
            size: 12
        });
        page.drawText(match.result, {
            x: 320,
            y: 600,
            size: 12
        });

        let changedBytesKaPromise = pdfdoc.save();
        changedBytesKaPromise.then(function (changedBytes) {
            if(fs.existsSync(matchFileName + ".pdf") == true){
                fs.writeFileSync(matchFileName +"1.pdf", changedBytes);
            } else {
                fs.writeFileSync(matchFileName , changedBytes);
            }
        })
    })
}

function putMatchInteams(teams,match){
    let t1idx = -1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.s1,
        oppScore: match.s2,
        result: match.result
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.s2,
        oppScore: match.s1,
        result: match.result
    });
    
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opp Score");
        sheet.cell(1, 4).string("Result");
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }

    wb.write(args.excel);
}


// read using jsdom
// make excel using excel4node
// make folder and pdfs using pdf-lib
