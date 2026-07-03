const axios = require("axios");
const admin = require("firebase-admin");

// Firebase key from GitHub Secrets
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
});

async function syncMatches() {
  try {
    console.log("Fetching API...");

    const response = await axios.get(
      "https://webws.365scores.com/web/games/allscores/?appTypeId=5&sports=1"
    );

    const games = response.data.games || [];

    const db = admin.database().ref("matches");

    for (let game of games) {

      const matchData = {
        gameId: game.id,
        competitionId: game.competitionId,
        league: game.competitionDisplayName,
        home: game.homeCompetitor.name,
        away: game.awayCompetitor.name,
        homeScore: game.homeCompetitor.score,
        awayScore: game.awayCompetitor.score,
        status: game.statusText,
        shortStatus: game.shortStatusText,
        startTime: game.startTime
      };

      await db.child(game.id.toString()).set(matchData);
    }

    console.log("Firebase updated successfully");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

syncMatches();
