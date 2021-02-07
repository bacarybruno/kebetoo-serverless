const firebaseAdmin = require('firebase-admin')
const dayjs = require('dayjs')

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
  const interval = process.env.RANKING_RATE
  const [value, unit] = interval.split(' ')
  const lastActive = dayjs()
    .subtract(parseInt(value, 10), unit)
    .subtract(15, 'seconds')
    .toISOString()
  console.log(`Going to fetch posts with param lastActive = ${lastActive}`)
  // get all post from last execution
  const { data } = await getAllPosts({ lastActive })
  console.log(`Going to calculate ranking of ${data.length} posts`)
  const results = await setPostsScores(data)
  console.log('Operation successful')
  return sendStatus(200, results)
}
