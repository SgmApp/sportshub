const axios = require("axios");
const admin = require("firebase-admin");

const parse365 = require("./parse/parse365");
const parseKing = require("./parse/parseKing");
const parseCustom = require("./parse/parseCustom");

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sports-hub-6bc4b-default-rtdb.firebaseio.com"
});

const db = admin.database();
let workflowLog = "";

function addLog(text) {

    console.log(text);

    workflowLog += text + "\n";

}

async function updateWorkflow(status) {

    await db.ref("workflow").set({

        status: status,

        updatedAt: Date.now(),

        log: workflowLog

    });

}

// ---------------- SETTINGS ----------------

async function getSettings() {

    const snap = await db.ref("settings").once("value");

    return snap.val() || {};

}

// ---------------- DATE ----------------

function formatDate(date) {

    return date.toISOString().split("T")[0];

}

function replaceDate(url, today, startDate, endDate) {

    return url
        .replace("{date}", today)
        .replace("{startDate}", startDate)
        .replace("{endDate}", endDate);

}

// ---------------- LOAD API ----------------


async function loadMatches() {

    const settings = await getSettings();

    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const selected =
        settings.selected_parser || "parse1";

    if (
        !settings.parse ||
        !settings.parse[selected]
    ) {

        throw new Error(
            "Parser not found : " + selected
        );

    }

    const parserSettings =
        settings.parse[selected];

    const apiParser =
        String(
            parserSettings.api_parser || ""
        )
        .trim()
        .toLowerCase();

    const apiUrl =
        replaceDate(
            String(
                parserSettings.api_url || ""
            ),
            formatDate(today),
            formatDate(yesterday),
            formatDate(tomorrow)
        );
    const gameApiUrl =
    String(
        parserSettings.game_api_url || ""
    );

    addLog("Parser : " + apiParser);
    addLog("API : " + apiUrl);
    addLog("Game API : " + gameApiUrl);

    if (!apiUrl) {

        throw new Error("API URL Empty");

    }

    const response =
        await axios.get(apiUrl);

    let parsed;

    switch (apiParser) {

        case "365":

            parsed =
                parse365(response.data);

            break;

        case "king":

            parsed =
                parseKing(response.data);

            break;

        case "custom":

            parsed =
                parseCustom(response.data);

            break;

        default:

            throw new Error(
                "Unknown Parser : " + apiParser
            );

    }

    parsed.yesterday = yesterday;
    parsed.today = today;
    parsed.tomorrow = tomorrow;

    return parsed;

}

async function syncMatches() {

    try {

   addLog("===== Sports Hub Sync Started =====");
        await updateWorkflow("running");

  // const data = await loadMatches();

  //const settings = await getSettings();
        const data = await loadMatches();

// Save Sports
if (data.sports && data.sports.length > 0) {

    const sportsRef = db.ref("sports");

    for (const s of data.sports) {

        await sportsRef.child(String(s.id).padStart(2, "0")).set({
            id: s.id,
            name: s.name,
            nameForURL: s.nameForURL || "",
            drawSupport: !!s.drawSupport,
            totalGames: s.totalGames || 0,
            liveGames: s.liveGames || 0,
            imageVersion: s.imageVersion || 1
        });

    }

    addLog("Sports updated : " + data.sports.length);

}

const settings = await getSettings();

const parserSettings =
    settings.parse[settings.selected_parser];

const currentApi =
    parserSettings.api_url;
        const gameApiUrl =
    parserSettings.game_api_url || "";

const apiSnap =
    await db.ref("settings/last_api").once("value");

const lastApi =
    apiSnap.val() || "";

const apiChanged =
    currentApi !== lastApi;

if (apiChanged) {

     addLog("API changed. Clearing old matches and competitions.");

    await db.ref("matches").remove();

    await db.ref("competitions").remove();

    await db.ref("settings/last_api")
        .set(currentApi);

}


        const competitions =
            data.competitions || [];

        const games =
            data.games || [];

        const yesterday =
            data.yesterday;

        const today =
            data.today;

        const tomorrow =
            data.tomorrow;

        addLog("Competitions : " + competitions.length);

       addLog("Games : " + games.length);

const selectedSportsSnap = await db
    .ref("settings/selected_sports")
    .once("value");

const selectedSports = selectedSportsSnap.val() || {};

// Save competitions

for (const c of competitions) {

    // Sport selected അല്ലെങ്കിൽ skip
    if (selectedSports[String(c.sportId)] !== true) {
        continue;
    }

    const compRef = db.ref("competitions")
        .child(String(c.id));

    const selectionSnap = await db
        .ref("competition_selection")
        .child(String(c.id))
        .once("value");

    const selected = selectionSnap.exists()
        ? selectionSnap.val()
        : false;

    await compRef.set({
        id: c.id,
        sportId: c.sportId,
        name: c.name,
        selected: selected
    });
}
        

        addLog("Competition list updated.");

        // Read selected competitions

        const compSnap =
            await db.ref("competitions")
                .once("value");

        let allowedCompetitions = [];

        compSnap.forEach((child) => {

            const competition =
                child.val();

            if (
                competition &&
                competition.selected === true
            ) {

                allowedCompetitions.push(
                    competition.id
                );

            }

        });

       addLog(
    "Selected competitions : " +
    allowedCompetitions.length
);

        const matchesRef =
    db.ref("matches");

const currentCompetitionIds = competitions.map(function (c) {

    return Number(c.id);

});
        
        const oldMatchesSnap =
    await matchesRef.once("value");

const removeTasks = [];

oldMatchesSnap.forEach(function (child) {

    const match = child.val();

    if (!match)
        return;

    const competitionId =
        Number(match.competitionId);

    // Admin unselected competition
    if (!allowedCompetitions.includes(competitionId)) {

        addLog(
            "Removing match : " +
            match.gameId
        );

        removeTasks.push(
            child.ref.remove()
        );

    }

});

await Promise.all(removeTasks);





        // Process matches

for (const game of games) {

    const competitionId =
        Number(game.competitionId);

    if (!allowedCompetitions.includes(competitionId)) {

        addLog(
            "Skipping : " +
            game.home +
            " vs " +
            game.away
        );

        continue;

    }

    addLog(
        "Processing : " +
        game.home +
        " vs " +
        game.away
    );

    // Game Details API

            let detail = {};

if (gameApiUrl && gameApiUrl.trim() !== "") {

    try {

        const detailUrl = gameApiUrl.replace(
            "{gameId}",
            game.gameId
        );

        const detailResponse = await axios.get(detailUrl);

        detail = detailResponse.data || {};

        addLog(JSON.stringify(detail, null, 2));

    } catch (e) {

        addLog(
            "Game API Failed : " +
            game.gameId +
            " : " +
            e.message
        );

        detail = {};

    }

}
            
            const matchData = {

                gameId:
                    game.gameId,
                sportId: 
                    game.sportId,  

                competitionId:
                    game.competitionId,

                league:
                    game.league,

                home:
                    game.home,

                away:
                    game.away,

                score:
                    game.score,

                status:
                    game.status,

                shortStatus:
                    game.shortStatus,

                streamUrl:
                    game.streamUrl || "",

                stadium:
                    game.stadium,

                date:
                    game.date,

                time:
                    game.time,

                matchTimeMillis:
                    game.matchTimeMillis,

                homeLogo:
                    game.homeLogo,

                awayLogo:
                    game.awayLogo,
                homeCompetitorId:
        detail.game &&
        detail.game.homeCompetitor
            ? detail.game.homeCompetitor.id
            : 0,

    awayCompetitorId:
        detail.game &&
        detail.game.awayCompetitor
            ? detail.game.awayCompetitor.id
            : 0

};

            

const playerMap = {};

const members =
    detail.game && detail.game.members
        ? detail.game.members
        : detail.members || [];

members.forEach(function(player) {
    playerMap[player.id] = player.name;
});

matchData.goalEvents = [];

(detail.game && detail.game.events
    ? detail.game.events
    : []).forEach(function(ev){

    if(ev.eventType && ev.eventType.id === 1){

        

        matchData.goalEvents.push({

            playerId: ev.playerId || 0,

            playerName: playerMap[ev.playerId] || "",

            competitorId: ev.competitorId || 0,

            gameTime: ev.gameTimeDisplay || "",

            type: ev.eventType.name || "Goal"

        });

    }

});
            // Preserve existing streamUrl

            const oldSnap =
                await matchesRef
                    .child(String(game.gameId))
                    .once("value");

            if (oldSnap.exists()) {

                const old =
                    oldSnap.val();

                if (
                    old &&
                    old.streamUrl &&
                    old.streamUrl.trim() !== ""
                ) {

                    matchData.streamUrl =
                        old.streamUrl;

                                }

            }

            await matchesRef
                .child(String(game.gameId))
                .set(matchData);

            addLog(
    "Updated : " +
    game.gameId
);

        }

        // Remove matches older than yesterday

const allMatches = await matchesRef.once("value");

const removeMatchTasks = [];

allMatches.forEach(function (child) {

    const match = child.val();

    if (!match || !match.matchTimeMillis)
        return;

    // Match date
    const matchDate = new Date(match.matchTimeMillis);

    // Match കഴിഞ്ഞ് അടുത്ത ദിവസത്തിന്റെ അവസാനം വരെ സൂക്ഷിക്കുക
    const deleteAfter = new Date(matchDate);
    deleteAfter.setDate(deleteAfter.getDate() + 1);
    deleteAfter.setHours(23, 59, 59, 999);

    if (Date.now() > deleteAfter.getTime()) {

        addLog(
            "Removing expired match : " + match.gameId
        );

        removeMatchTasks.push(
            child.ref.remove()
        );

    }

});

await Promise.all(removeMatchTasks);

        
// Remove old competitions

const allCompetitions =
    await db.ref("competitions").once("value");

const removeCompetitionTasks = [];

allCompetitions.forEach(function (child) {

    let found = false;

    for (const c of competitions) {

        if (String(c.id) === child.key) {

            found = true;
            break;

        }

    }

if (!found) {

    addLog(
        "Removing old competition : " +
        child.key
    );

    removeCompetitionTasks.push(
        child.ref.remove()
    );



    }

});


await Promise.all(removeCompetitionTasks);

addLog("Old competitions removed.");

addLog("===== Sports Hub Sync Completed =====");

await updateWorkflow("completed");

} catch (e) {

    addLog("Sync Error : " + e.toString());
    addLog(e.stack || "");

    await updateWorkflow("failed");

    console.error(e);

}

}

syncMatches();
