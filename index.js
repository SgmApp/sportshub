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

    const data = await loadMatches();

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

        // Save competitions

        for (const c of competitions) {

    const compRef = db.ref("competitions")
        .child(String(c.id));

    const oldSnap = await compRef.once("value");

    let selected = false;

    if (
        oldSnap.exists() &&
        oldSnap.child("selected").exists()
    ) {
        selected = oldSnap.child("selected").val();
    }

    await compRef.set({

        id: c.id,

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

    if (
        !currentCompetitionIds.includes(
            Number(match.competitionId)
        )
    ) {

        addLog(
    "Removing old competition match : " +
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
        game.competitionId || 0;

    if (
        allowedCompetitions.length > 0 &&
        !allowedCompetitions.includes(
            competitionId
        )
    ) {

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
                    game.awayLogo

            };

            

const playerMap = {};

(detail.members || []).forEach(function(player){

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

// ഇന്നലെ 00:00 മുതൽ മാത്രം സൂക്ഷിക്കുക
const keepFrom = new Date();
keepFrom.setHours(0, 0, 0, 0);
keepFrom.setDate(keepFrom.getDate() - 1);

allMatches.forEach(function (child) {

    const match = child.val();

    if (!match || !match.matchTimeMillis)
        return;

    if (match.matchTimeMillis < keepFrom.getTime()) {

        addLog("Removing expired match : " + match.gameId);

        removeMatchTasks.push(child.ref.remove());

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
