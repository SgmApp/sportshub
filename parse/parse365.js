module.exports = function (data) {

    const competitions = [];
    const games = [];

    (data.competitions || []).forEach(function (c) {

        competitions.push({
            id: c.id,
            name: c.name
        });

    });

    (data.games || []).forEach(function (g) {

        const start = new Date(g.startTime);

    

        // ---------------- Status ----------------

let status = g.statusText || "";
let shortStatus = g.shortStatusText || "";
let adapterStatus = "";

const s = status.toLowerCase();
const ss = shortStatus.toUpperCase();

// After Extra Time
if (
    s.includes("after et") ||
    s.includes("after extra time") ||
    ss === "AFTER ET" ||
    ss === "AET"
) {

    adapterStatus = "AET";

// Full Time
} else if (
    s.includes("ended") ||
    s.includes("finished") ||
    ss === "ENDED" ||
    ss === "FT"
) {

    adapterStatus = "FT";

// Extra Time
} else if (
    s.includes("extra time") ||
    ss === "ET"
) {

    adapterStatus = "ET";

// Penalties
} else if (
    s.includes("penalties") ||
    ss === "AP"
) {

    adapterStatus = "AP";

// Scheduled
} else if (
    s.includes("scheduled") ||
    s.includes("not started") ||
    ss === "NS"
) {

    adapterStatus = "Scheduled";

// Postponed
} else if (
    s.includes("postponed")
) {

    adapterStatus = "Postponed";

// Cancelled
} else if (
    s.includes("cancelled")
) {

    adapterStatus = "Cancelled";

// Abandoned
} else if (
    s.includes("abandoned")
) {

    adapterStatus = "Abandoned";

// Live Status
} else if (
    ss.includes("'") ||
    ss.includes("+") ||
    ss === "HT" ||
    ss === "LIVE"
) {

    adapterStatus = shortStatus;

// Fallback
} else {

    adapterStatus = shortStatus;

    if (!adapterStatus || adapterStatus.trim() === "") {
        adapterStatus = "LIVE";
    }

}
        // ---------------- Score ----------------

        let score = "VS";

        if (
            adapterStatus !== "Scheduled" &&
            adapterStatus !== "Postponed" &&
            adapterStatus !== "Cancelled" &&
            adapterStatus !== "Abandoned"
        ) {

            score =
                (g.homeCompetitor?.score ?? 0) +
                " - " +
                (g.awayCompetitor?.score ?? 0);

            if (
                adapterStatus === "AP" &&
                g.homeCompetitor?.penaltyScore != null &&
                g.awayCompetitor?.penaltyScore != null
            ) {

                score +=
                    " (P " +
                    g.homeCompetitor.penaltyScore +
                    "-" +
                    g.awayCompetitor.penaltyScore +
                    ")";

            }

        }

        // ---------------- Goal Events ----------------

        const goalEvents = [];

        (g.events || []).forEach(function (ev) {

            const type = (ev.type || "").toLowerCase();

            if (
                type !== "goal" &&
                type !== "owngoal" &&
                type !== "penaltygoal"
            ) {
                return;
            }

            goalEvents.push({

                playerId: ev.playerId || 0,

                // API-ൽ ഉണ്ടെങ്കിൽ നേരിട്ട് save ചെയ്യും
                playerName: ev.playerName || "",

                competitorNum: ev.competitorNum || 0,

                gameTime:
                    ev.gameTime ||
                    ev.minute ||
                    "",

                type: ev.type || "goal"

            });

        });

        // ---------------- Save ----------------

        games.push({

            gameId: g.id,

            competitionId: g.competitionId,

            league: g.competitionDisplayName || "",

            home: g.homeCompetitor?.name || "",

            away: g.awayCompetitor?.name || "",

            score: score,

            status: adapterStatus,

            shortStatus: shortStatus,

            streamUrl: g.streamUrl || "",

            stadium: g.venue?.name || "",

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
                "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/competitors/" +
                (g.homeCompetitor?.id || ""),

            awayLogo:
                "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/competitors/" +
                (g.awayCompetitor?.id || ""),

            goalEvents: goalEvents

        });

    });

    return {

        competitions,

        games

    };

};
