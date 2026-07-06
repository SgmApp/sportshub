// model.js

function Competition(id, name) {

    return {

        id: id || 0,

        name: name || ""

    };

}

function Match() {

    return {

        gameId: 0,

        competitionId: 0,

        league: "",

        home: "",

        away: "",

        score: "VS",

        status: "Scheduled",

        shortStatus: "",

        streamUrl: "",

        stadium: "",

        date: "",

        time: "",

        matchTimeMillis: 0,

        homeLogo: "",

        awayLogo: ""

    };

}

module.exports = {

    Competition,

    Match

};
