const decay = require('decay')
const { MongoClient, ObjectId } = require('mongodb')
const { default: axios } = require('axios')
const firebaseAdmin = require('firebase-admin')

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
})

const dbUrl = process.env.DB_CONN_STR
const dbName = process.env.DB_NAME
const firebaseApiKey = process.env.FIREBASE_API_KEY
let dbInstance = null

const hotScore = decay.redditHot()

const countReaction = (post, type) => post
  .reactions
  .filter((reaction) => reaction.type === type)
  .length

const getAllPosts = async () => {
  const authToken = await firebaseAdmin.auth().createCustomToken('kebetoo-ranking')
  const { data: { idToken } } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
    token: authToken,
    returnSecureToken: true,
  })
  return api.get('/posts?_sort=updatedAt:desc&_limit=-1', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })
}

const connectToDatabase = async () => {
  if (dbInstance) return Promise.resolve(dbInstance)
  const client = await MongoClient.connect(dbUrl)
  dbInstance = client.db(dbName, { noListener: true })
  return dbInstance
}

const sendStatus = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) })

const setPostsScores = async (posts) => {
  const db = await connectToDatabase()
  const operations = posts.map((post) => {
    const score = hotScore(
      countReaction(post, 'like') + post.comments.length,
      countReaction(post, 'dislike'),
      new Date(post.updatedAt),
    )
    return {
      updateOne: {
        filter: {
          _id: ObjectId(post.id),
        },
        update: {
          $set: { score },
        },
      },
    }
  })
  return db.collection('posts').bulkWrite(operations, { ordered: false })
}

module.exports = {
  sendStatus,
  getAllPosts,
  setPostsScores,
  connectToDatabase,
}
