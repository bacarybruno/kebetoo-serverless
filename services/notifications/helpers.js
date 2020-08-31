const axios = require('axios').default

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
})

const PostTypes = {
  AUDIO: 'Audio',
  IMAGE: 'Image',
  TEXT: 'Text',
  REPOST: 'Repost',
}

const AllowedModels = {
  COMMENTS: 'comments',
  REACTIONS: 'reactions',
}

const getPostType = (post) => {
  if (post.repost) {
    return PostTypes.REPOST
  }
  if (post.audio && post.audio.url) {
    return PostTypes.AUDIO
  }
  if (post.image && post.image.url) {
    return PostTypes.IMAGE
  }
  if (post.content && post.content.length > 0) {
    return PostTypes.TEXT
  }
  return null
}

const validateBody = ({ event, model }) => {
  const allowedModels = Object.values(AllowedModels)
  if (event !== 'entry.create') {
    throw new Error(`Bad event type. Expected 'entry.create' but got '${event}' instead`)
  }
  if (!allowedModels.includes(model)) {
    throw new Error(`Bad event model. Expected one of ${allowedModels.join(', ')} but got '${model}' instead`)
  }
  return true
}

const getFcmToken = async (author) => {
  const { data } = await api.get(`/authors/${author}`)
  const { notificationToken } = data
  if (!notificationToken) {
    throw new Error('A fcm token is required to send notifications')
  }
  return notificationToken
}

const sendStatus = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) })

module.exports = {
  getPostType,
  validateBody,
  getFcmToken,
  sendStatus,
  AllowedModels,
}
