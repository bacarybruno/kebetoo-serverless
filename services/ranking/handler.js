const firebaseAdmin = require('firebase-admin')

const { sendStatus, getAllPosts, setPostsScores } = require('./helpers')

// Check the number of initialized firebase apps
// to avoid redeclaring the app
if (firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
  })
}

// Handler
module.exports.rank = async () => {
  const { data } = await getAllPosts()
  const results = await setPostsScores(data)
  return sendStatus(200, results)
}
