const firebaseAdmin = require('firebase-admin')
const {
  getFcmToken, getPostType, validateBody, sendStatus, AllowedModels,
} = require('./helpers')

// Check the number of initialized firebase apps
// to avoid redeclaring the app
if (firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
  })
}

// Handle comment-related notifications
const handleComments = async ({ entry }) => {
  console.log('Going to handle comments notifications')

  let fcmToken
  try {
    fcmToken = await getFcmToken(entry.post.author)
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }

  const fcmPayload = {
    notification: {
      title: `${entry.author.displayName} commented your post`,
      body: entry.content || 'Audio',
      tag: `comment-${entry.id}`,
    },
    data: {
      type: 'comment',
      payload: JSON.stringify(entry),
    },
  }
  const { successCount } = await firebaseAdmin.messaging().sendToDevice(fcmToken, fcmPayload)

  console.log('Notification successfully sent:', fcmPayload)

  return sendStatus(200, { success: true, count: successCount })
}

// Handle reaction-related notifications for post
const handlePostReaction = async (entry) => {
  console.log('Going to handle post reactions notifications')

  let fcmToken
  try {
    fcmToken = await getFcmToken(entry.post.author)
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }

  const fcmPayload = {
    notification: {
      title: `${entry.author.displayName} reacted to your post`,
      body: entry.post.content || getPostType(entry.post),
      tag: `post-${entry.post.id}-reaction`,
    },
    data: {
      type: 'post-reaction',
      payload: JSON.stringify(entry),
    },
  }
  const { successCount } = await firebaseAdmin.messaging().sendToDevice(fcmToken, fcmPayload)

  console.log('Notification successfully sent:', fcmPayload)

  return sendStatus(200, { success: true, count: successCount })
}

// Handle reaction-related notifications for comments
const handleCommentReaction = async (entry) => {
  console.log('Going to handle comments reactions notifications')

  let fcmToken
  try {
    fcmToken = await getFcmToken(entry.comment.author)
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }

  const fcmPayload = {
    notification: {
      title: `${entry.author.displayName} reacted to your comment`,
      body: entry.comment.content || 'Audio',
      tag: `comment-${entry.comment.id}-reaction`,
    },
    data: {
      type: 'comment-reaction',
      payload: JSON.stringify(entry),
    },
  }
  const { successCount } = await firebaseAdmin.messaging().sendToDevice(fcmToken, fcmPayload)

  console.log('Notification successfully sent:', fcmPayload)

  return sendStatus(200, { success: true, count: successCount })
}

// Handle reaction-related notifications
const handleReactions = async ({ entry }) => {
  const result = entry.comment
    ? await handleCommentReaction(entry)
    : await handlePostReaction(entry)
  return result
}

// Handler
module.exports.create = async (event) => {
  const body = JSON.parse(event.body) || {}

  try {
    console.log('Going to validate body:', JSON.stringify(event.body))
    validateBody(body)
  } catch (error) {
    console.log('Body validation failed:', error.message)
    return sendStatus(400, { errorMessage: error.message })
  }
  console.log('Body validated successfully')

  switch (body.model) {
    case AllowedModels.COMMENTS:
      return handleComments(body)
    case AllowedModels.REACTIONS:
      return handleReactions(body)
    default:
      console.log('Unknown body model:', body.model)
      return sendStatus(500, { message: 'An unexpected error occured' })
  }
}
