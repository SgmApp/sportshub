module.exports = function (data) {

    const competitions = [];
    const games = [];

    (data.competitions || []).forEach(function (c) {

        competitions.push({

            id: Number(c.id),

            name: c.name || ""

        });

    });

    (data.games || []).forEach(function (g) {

        const start = new Date(g.startTime);

        games.push({

            gameId:
                Number(g.id),

            competitionId:
                Number(g.competitionId),

            league:
                g.competitionName || "",

            home:
                g.homeName || "",

            away:
                g.awayName || "",

            score:
                g.score || "VS",

            status:
                g.status || "Scheduled",

            shortStatus:
                g.shortStatus || g.status || "Scheduled",

            streamUrl:
                g.streamUrl || "",

            stadium:
                g.stadium || "",

            date:
                start.toLocaleDateString("en-GB")
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
