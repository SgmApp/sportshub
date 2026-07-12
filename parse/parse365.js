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

// Status    

let status = g.statusText || "";    
let shortStatus = g.shortStatusText || "";    
let adapterStatus = "";    

const s = status.toLowerCase();    
const ss = shortStatus.toUpperCase();    

if (    
    s.includes("ended") ||    
    s.includes("finished")    
) {    

    adapterStatus = "FT";    

} else if (    
    s.includes("penalties")    
) {    

    adapterStatus = "AP";    

} else if (    
    s.includes("scheduled")    
) {    

    adapterStatus = "Scheduled";    

} else if (    
    s.includes("postponed")    
) {    

    adapterStatus = "Postponed";    

} else if (    
    s.includes("cancelled")    
) {    

    adapterStatus = "Cancelled";    

} else if (    
    s.includes("abandoned")    
) {    

    adapterStatus = "Abandoned";    

} else if (
    ss.includes("'") ||
    ss.includes("+") ||
    ss === "HT" ||
    ss === "LIVE" ||
    ss === "ET"
) {

    adapterStatus = shortStatus;

} else {

    adapterStatus = shortStatus || "LIVE";

}

// Score    

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
        (g.awayCompetitor?.id || "")    

});

});

return {

competitions,    

games

};

};
