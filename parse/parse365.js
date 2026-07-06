module.exports = function (data) {

    const competitions = [];
    const games = [];

    (data.competitions || []).forEach(c => {

        competitions.push({
            id: c.id,
            name: c.name
        });

    });

    (data.games || []).forEach(g => {

        games.push({

            gameId: g.id,

            competitionId: g.competitionId,

            league: g.competitionDisplayName || "",

            home: g.homeCompetitor?.name || "",

            away: g.awayCompetitor?.name || "",

            score: "",

            status: "",

            shortStatus: "",

            streamUrl: "",

            stadium: g.venue?.name || "",

            date: "",

            time: "",

            matchTimeMillis: 0,

            homeLogo: "",

            awayLogo: ""

        });

    });

    return {

        competitions,

        games

    };

};
