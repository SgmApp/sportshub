function convertKingDate(esd) {

    if (!esd) return new Date();

    esd = String(esd);

    return new Date(
        Number(esd.substring(0, 4)),
        Number(esd.substring(4, 6)) - 1,
        Number(esd.substring(6, 8)),
        Number(esd.substring(8, 10)),
        Number(esd.substring(10, 12)),
        Number(esd.substring(12, 14))
    );

}

module.exports = function (data) {

    const competitions = [];
    const games = [];

    if (!data || !data.Stages) {

        return {
            competitions: competitions,
            games: games
        };

    }

    data.Stages.forEach(function (stage) {

        const competitionId =
            Number(stage.CompId || stage.Sid || 0);

        competitions.push({

            id: competitionId,

            name: stage.Cnm || stage.CompN || stage.Snm || ""

        });

        (stage.Events || []).forEach(function (ev) {

            const start =
                convertKingDate(ev.Esd);

            const homeScore =
                ev.Tr1 || "";

            const awayScore =
                ev.Tr2 || "";

            let score = "VS";

            if (
                homeScore !== "" &&
                awayScore !== ""
            ) {

                score =
                    homeScore + " - " + awayScore;

            }

            let streamUrl = "";

            if (
                ev.Media &&
                ev.Media["29"] &&
                ev.Media["29"].length > 0 &&
                ev.Media["29"][0].streamhls
            ) {

                streamUrl =
                    ev.Media["29"][0].streamhls;

            }

            games.push({

                gameId:
                    Number(ev.Eid || ev.Id || 0),

                competitionId:
                    competitionId,

                league:
                    stage.Cnm || stage.CompN || stage.Snm || "",

                home:
                    ev.T1 && ev.T1[0]
                    ? ev.T1[0].Nm
                    : "",

                away:
                    ev.T2 && ev.T2[0]
                    ? ev.T2[0].Nm
                    : "",

                score:
                    score,

                status:
                    ev.Eps || "Scheduled",

                shortStatus:
                    ev.Eps || "Scheduled",

                streamUrl:
                    streamUrl,

                stadium:
                    "",

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
                    ev.T1 && ev.T1[0]
                    ? "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/" +
                      ev.T1[0].Img
                    : "",

                awayLogo:
                    ev.T2 && ev.T2[0]
                    ? "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/" +
                      ev.T2[0].Img
                    : ""

            });

        });

    });

    return {

        competitions: competitions,

        games: games

    };

};
