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

    console.log("Parser :", apiParser);
    console.log("API :", apiUrl);

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

        console.log("===== Sports Hub Sync Started =====");

        const data =
            await loadMatches();

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

        console.log(
            "Competitions :",
            competitions.length
        );

        console.log(
            "Games :",
            games.length
        );

        // Save competitions

        for (const c of competitions) {

            await db.ref("competitions")
                .child(String(c.id))
                .update({

                    id: c.id,

                    name: c.name

                });

        }

        console.log(
            "Competition list updated."
        );

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

        console.log(
            "Selected competitions :",
            allowedCompetitions.length
        );

        const matchesRef =
            db.ref("matches");

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

            console.log(
                "Processing :",
                game.home,
                "vs",
                game.away
            );
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

            console.log(
                "Updated:",
                game.gameId
            );

        }

        // Remove old competitions & matches only after successful sync

        const allCompetitions =
            await db.ref("competitions").once("value");

        allCompetitions.forEach(function (child) {

            let found = false;

            for (const c of competitions) {

                if (String(c.id) === child.key) {

                    found = true;
                    break;

                }

            }

            if (!found) {

                child.ref.remove();

            }

        });

        const allMatches =
    await matchesRef.once("value");

allMatches.forEach(function (child) {

    const match = child.val();

    if (!match)
        return;

    let found = false;

    for (const game of games) {

        if (
            Number(game.gameId) === Number(match.gameId) &&
            Number(game.competitionId) === Number(match.competitionId)
        ) {

            found = true;
            break;

        }

    }

    if (!found) {

        console.log(
            "Removing old match:",
            match.gameId
        );

        child.ref.remove();

    }

});

        console.log(
            "Old competitions & matches removed."
        );

        console.log(
            "===== Firebase Sync Completed ====="
        );

    } catch (e) {

        console.error(
            "Sync Error :",
            e
        );

    }

}

syncMatches();
