const decay = require('decay')
const { MongoClient, ObjectId } = require('mongodb')
const axios = require('axios').default

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
})

const dbUrl = process.env.DB_CONN_STR
const dbName = process.env.DB_NAME
let dbInstance = null

const hotScore = decay.redditHot()

const countReaction = (post, type) => post
  .reactions
  .filter((reaction) => reaction.type === type)
  .length

const getAllPosts = async () => api.get('/posts?_sort=createdAt:desc&_limit=-1')

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
