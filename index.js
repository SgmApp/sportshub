const axios = require("axios");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sports-hub-6bc4b-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function syncMatches() {

    try {

        console.log("===== Sports Hub Sync Started =====");

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const url =
            `https://webws.365scores.com/web/games/allscores/?appTypeId=5&langId=1&timezoneName=Asia/Kolkata&userCountryId=80&sports=1&startDate=${today}&endDate=${today}`;

        const response = await axios.get(url);

        const competitions =
            response.data.competitions || [];

        const games =
            response.data.games || [];

        console.log("Competitions :", competitions.length);
        console.log("Games :", games.length);

        // Save competitions

        for (const c of competitions) {

            await db.ref("competitions")
                .child(String(c.id))
                .update({
                    id: c.id,
                    name: c.name
                });

        }

        console.log("Competition list updated.");

        // Read selected competitions

        const compSnap = await db
            .ref("competitions")
            .once("value");

        let allowedCompetitions = [];

        compSnap.forEach(child => {

            const competition = child.val();

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

        // Start processing games

        for (const game of games) {

            const competitionId =
                game.competitionId || 0;

            // Skip unselected competitions

            if (
                allowedCompetitions.length > 0 &&
                !allowedCompetitions.includes(
                    competitionId
                )
            ) {

                continue;

            }

            const home =
                game.homeCompetitor || {};

            const away =
                game.awayCompetitor || {};

            const venue =
                game.venue || {};

            console.log(
                "Processing:",
                home.name,
                "vs",
                away.name
            );

            // Part 2 starts here
                    // Status

            let status =
                game.statusText || "";

            let shortStatus =
                game.shortStatusText || "";

            let adapterStatus = "";

            const s =
                status.toLowerCase();

            const ss =
                shortStatus.toUpperCase();

            if (
                s.includes("ended") ||
                s.includes("finished")
            ) {

                adapterStatus = "FT";

            }
            else if (
                s.includes("penalties")
            ) {

                adapterStatus = "AP";

            }
            else if (
                s.includes("scheduled")
            ) {

                adapterStatus = "Scheduled";

            }
            else if (
                s.includes("postponed")
            ) {

                adapterStatus = "Postponed";

            }
            else if (
                s.includes("cancelled")
            ) {

                adapterStatus = "Cancelled";

            }
            else if (
                s.includes("abandoned")
            ) {

                adapterStatus = "Abandoned";

            }
            else {

                if (
                    ss.includes("'") ||
                    ss === "HT" ||
                    ss === "LIVE" ||
                    ss === "ET" ||
                    ss.includes("+")
                ) {

                    adapterStatus = shortStatus;

                } else {

                    adapterStatus = "LIVE";

                }

            }

            // Score

            let score = "VS";

            if (
                adapterStatus !== "Scheduled" &&
                adapterStatus !== "Postponed" &&
                adapterStatus !== "Cancelled" &&
                adapterStatus !== "Abandoned"
            ) {

                const homeScore =
                    home.score ?? 0;

                const awayScore =
                    away.score ?? 0;

                score =
                    homeScore +
                    " - " +
                    awayScore;

                if (
                    adapterStatus === "AP" &&
                    home.penaltyScore != null &&
                    away.penaltyScore != null
                ) {

                    score +=
                        " (P " +
                        home.penaltyScore +
                        "-" +
                        away.penaltyScore +
                        ")";

                }

            }

            const start =
                new Date(game.startTime);

            const homeLogo =
                "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/competitors/" +
                home.id;

            const awayLogo =
                "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/competitors/" +
                away.id;

            const matchData = {

                gameId:
                    game.id,

                competitionId:
                    competitionId,

                league:
                    game.competitionDisplayName || "",

                home:
                    home.name || "",

                away:
                    away.name || "",

                score:
                    score,

                status:
                    adapterStatus,

                shortStatus:
                    shortStatus,

                streamUrl:
                    game.streamUrl || "",

                stadium:
                    venue.name || "",

                date:
                    start
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-"),

                time:
                    start.toLocaleTimeString(
                        "en-US",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }
                    ),

                matchTimeMillis:
                    start.getTime(),

                homeLogo:
                    homeLogo,

                awayLogo:
                    awayLogo

            };

            // Part 3 starts here
                    // Check existing match

            const oldSnap =
                await matchesRef
                    .child(String(game.id))
                    .once("value");

            if (oldSnap.exists()) {

                const old =
                    oldSnap.val();

                // Preserve existing streamUrl

                if (
                    old.streamUrl &&
                    old.streamUrl !== ""
                ) {

                    matchData.streamUrl =
                        old.streamUrl;

                }

            }

            // Save / Update match

            await matchesRef
                .child(String(game.id))
                .update(matchData);

            console.log(
                "Updated:",
                game.id
            );

        }

        // Part 4 starts here
            // Delete old date matches

        const allMatches =
            await matchesRef.once("value");

        const todayDate =
            new Date()
                .toLocaleDateString("en-GB")
                .replace(/\//g, "-");

        

        allMatches.forEach(child => {

            const m = child.val();

            if (!m) return;

            // Remove old date

            if (m.date !== todayDate) {

                child.ref.remove();

                return;

            }

            // Remove unselected competitions

            if (
                allowedCompetitions.length > 0 &&
                !allowedCompetitions.includes(
                    m.competitionId
                )
            ) {

                child.ref.remove();

            }

        });

        console.log(
            "===== Firebase Sync Completed ====="
        );

    } catch (e) {

        console.error(
            "Sync Error:",
            e
        );

    }

}

syncMatches();
