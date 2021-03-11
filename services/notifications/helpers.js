const { default: axios } = require('axios')
const firebaseAdmin = require('firebase-admin')

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
})

const firebaseApiKey = process.env.FIREBASE_API_KEY

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

const AllowedEvents = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
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
  const allowedEvents = Object.values(AllowedEvents)
  if (!allowedEvents.includes(event)) {
    throw new Error(`Bad event type. Expected one of ${allowedEvents.join(', ')} but got '${event}' instead`)
  }
  if (!allowedModels.includes(model)) {
    throw new Error(`Bad event model. Expected one of ${allowedModels.join(', ')} but got '${model}' instead`)
  }
  return true
}

const getFcmToken = async (author) => {
  const authToken = await firebaseAdmin.auth().createCustomToken('kebetoo-notifications')
  const { data: { idToken } } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
    token: authToken,
    returnSecureToken: true,
  })
  const { data } = await api.get(`/authors/${author}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })
  const { notificationToken: fcmToken, id } = data
  if (!fcmToken) {
    throw new Error('A fcm token is required to send notifications')
  }
  return { fcmToken, uid: id }
}

const sendStatus = (statusCode, body) => {
  console.log(statusCode, body)
  return ({ statusCode, body: JSON.stringify(body) })
}

const getBadgeCount = async (uid) => {
  const notifications = await firebaseAdmin.database().ref(`/notifications/${uid}`).once('value')
  if (notifications.exists()) {
    return Object.keys(notifications.val()).length.toString()
  }
  return '0'
}

const persistNotification = async (uid, data) => (
  firebaseAdmin.database().ref(`/notifications/${uid}`).push(data)
)

module.exports = {
  getPostType,
  validateBody,
  getFcmToken,
  sendStatus,
  getBadgeCount,
  persistNotification,
  AllowedModels,
}
