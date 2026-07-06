module.exports = function (data) {

    const competitions = [];
    const games = [];

    if (!data) {

        return {
            competitions,
            games
        };

    }

    // Competitions

    (data.competitions || []).forEach(function (c) {

        competitions.push({

            id: Number(c.id || 0),

            name: c.name || ""

        });

    });

    // Games

    (data.games || []).forEach(function (g) {

        const start = new Date(g.startTime || Date.now());

        games.push({

            gameId: Number(g.id || g.gameId || 0),

            competitionId: Number(g.competitionId || 0),

            league: g.competitionDisplayName || g.league || "",

            home: g.home || "",

            away: g.away || "",

            score: g.score || "VS",

            status: g.status || "Scheduled",

            shortStatus: g.shortStatus || "",

            streamUrl: g.streamUrl || "",

            stadium: g.stadium || "",

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
                g.homeLogo || "",

            awayLogo:
                g.awayLogo || ""

        });

    });

    return {

        competitions,
        games

    };

};
