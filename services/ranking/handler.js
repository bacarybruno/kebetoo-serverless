const { sendStatus, getAllPosts, setPostsScores } = require('./helpers')

// Handler
module.exports.rank = async () => {
  const { data } = await getAllPosts()
  const results = await setPostsScores(data)
  return sendStatus(200, results)
}
