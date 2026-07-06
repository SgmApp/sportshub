function convertKingDate(esd) {

    if (!esd) return new Date();

    esd = String(esd);

    return new Date(

        Number(esd.substring(0,4)),
        Number(esd.substring(4,6)) - 1,
        Number(esd.substring(6,8)),
        Number(esd.substring(8,10)),
        Number(esd.substring(10,12)),
        Number(esd.substring(12,14))

    );

}

module.exports = function (data) {

    const competitions = [];
    const games = [];

    if (!data || !data.Stages) {

        return {

            competitions,
            games

        };

    }

    data.Stages.forEach(function (stage) {

        competitions.push({

            id: Number(stage.CompId || stage.Sid || 0),

            name: stage.Snm || ""

        });

        (stage.Events || []).forEach(function (ev) {

            games.push({

                id: Number(ev.Eid || ev.Id || 0),

                competitionId: Number(stage.CompId || stage.Sid || 0),

                competitionDisplayName: stage.Snm || "",

                homeCompetitor: {

                    id: Number(ev.T1 && ev.T1[0] ? ev.T1[0].ID : 0),

                    name: ev.T1 && ev.T1[0] ? ev.T1[0].Nm : "",

                    score: Number(ev.Tr1 || 0)

                },

                awayCompetitor: {

                    id: Number(ev.T2 && ev.T2[0] ? ev.T2[0].ID : 0),

                    name: ev.T2 && ev.T2[0] ? ev.T2[0].Nm : "",

                    score: Number(ev.Tr2 || 0)

                },

                venue: {

                    name: ""

                },

                streamUrl: "",

                statusText: ev.Eps || "",

                shortStatusText: ev.Eps || "",

                startTime: convertKingDate(ev.Esd),

                homeLogo:
                    "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/" +
                    (ev.T1 && ev.T1[0] ? ev.T1[0].Img : ""),

                awayLogo:
                    "https://imagecache.365scores.com/image/upload/f_auto,w_120,h_120,c_limit,q_auto:eco/v2/" +
                    (ev.T2 && ev.T2[0] ? ev.T2[0].Img : "")

            });

        });

    });

    return {

        competitions,
        games

    };

};
