const firebaseAdmin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const {
  getFcmToken,
  getPostType,
  validateBody,
  sendStatus,
  AllowedModels,
  persistNotification,
  getBadgeCount,
} = require('./helpers')

// Check the number of initialized firebase apps
// to avoid redeclaring the app
if (firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

const fcmOptions = {
  contentAvailable: true,
  priority: 'high',
}

const NOTIFICATION_TYPES = {
  COMMENT: 'comment',
  REPLY: 'reply',
  POST_REACTION: 'post-reaction',
  COMMENT_REACTION: 'comment-reaction',
}

// Handle post comment-related notifications
const handlePostComment = async (entry) => {
  console.log('Going to handle post comments notifications')

  if (entry.post.author === entry.author.id) {
    return sendStatus(400, { errorMessage: 'User should not receive notification on his own action' })
  }

  try {
    const { fcmToken, uid } = await getFcmToken(entry.post.author)

    const data = {
      messageId: uuidv4(),
      sentTime: Date.now(),
      data: {
        type: NOTIFICATION_TYPES.COMMENT,
        payload: JSON.stringify({
          postId: entry.post.id,
          author: {
            displayName: entry.author.displayName,
            photoURL: entry.author.photoURL,
            id: entry.author.id,
            uid: entry.author.uid,
          },
          content: entry.content,
        }),
      },
    }
    await persistNotification(uid, data)

    const badgeCount = await getBadgeCount(uid)
    const fcmPayload = {
      notification: {
        title: `${entry.author.displayName} a commenté votre post`,
        body: entry.content || 'Audio',
        tag: `post-${entry.post.id}-comment`,
        badge: badgeCount,
      },
    }
    const { successCount } = await firebaseAdmin
      .messaging()
      .sendToDevice(fcmToken, fcmPayload, fcmOptions)

    console.log('Notification successfully sent:', fcmPayload)
    return sendStatus(200, { success: true, count: successCount })
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }
}

// Handle thread comment-related notifications
const handleReplyComment = async (entry) => {
  console.log('Going to handle comments reply notifications')

  if (entry.thread.author === entry.author.id) {
    return sendStatus(400, { errorMessage: 'User should not receive notification on his own action' })
  }

  try {
    const { fcmToken, uid } = await getFcmToken(entry.thread.author)

    const data = {
      messageId: uuidv4(),
      sentTime: Date.now(),
      data: {
        type: NOTIFICATION_TYPES.REPLY,
        payload: JSON.stringify({
          postId: entry.thread.post,
          author: {
            displayName: entry.author.displayName,
            photoURL: entry.author.photoURL,
            id: entry.author.id,
            uid: entry.author.uid,
          },
          content: entry.content,
        }),
      },
    }
    await persistNotification(uid, data)

    const badgeCount = await getBadgeCount(uid)
    const fcmPayload = {
      notification: {
        title: `${entry.author.displayName} a répondu à votre commentaire`,
        body: entry.content || 'Audio',
        tag: `comment-${entry.thread.id}-reply`,
        badge: badgeCount,
      },
    }
    const { successCount } = await firebaseAdmin
      .messaging()
      .sendToDevice(fcmToken, fcmPayload, fcmOptions)

    console.log('Notification successfully sent:', fcmPayload)
    return sendStatus(200, { success: true, count: successCount })
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }
}

// Handle reaction-related notifications for post
const handlePostReaction = async (entry) => {
  console.log('Going to handle post reactions notifications')

  if (entry.post.author === entry.author.id) {
    return sendStatus(400, { errorMessage: 'User should not receive notification on his own action' })
  }

  try {
    const { fcmToken, uid } = await getFcmToken(entry.post.author)

    const data = {
      messageId: uuidv4(),
      sentTime: Date.now(),
      data: {
        type: NOTIFICATION_TYPES.POST_REACTION,
        payload: JSON.stringify({
          postId: entry.post.id,
          author: {
            displayName: entry.author.displayName,
            photoURL: entry.author.photoURL,
            id: entry.author.id,
            uid: entry.author.uid,
          },
          content: entry.post.content,
        }),
      },
    }
    await persistNotification(uid, data)

    const badgeCount = await getBadgeCount(uid)
    const fcmPayload = {
      notification: {
        title: `${entry.author.displayName} a réagi à votre post`,
        body: entry.post.content || getPostType(entry.post),
        tag: `post-${entry.post.id}-reaction`,
        badge: badgeCount,
      },
    }
    const { successCount } = await firebaseAdmin
      .messaging()
      .sendToDevice(fcmToken, fcmPayload, fcmOptions)

    console.log('Notification successfully sent:', fcmPayload)
    return sendStatus(200, { success: true, count: successCount })
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }
}

// Handle reaction-related notifications for comments
const handleCommentReaction = async (entry) => {
  console.log('Going to handle comments reactions notifications')

  if (entry.comment.author === entry.author.id) {
    return sendStatus(400, { errorMessage: 'User should not receive notification on his own action' })
  }

  try {
    const { fcmToken, uid } = await getFcmToken(entry.comment.author)

    const data = {
      messageId: uuidv4(),
      sentTime: Date.now(),
      data: {
        type: NOTIFICATION_TYPES.COMMENT_REACTION,
        payload: JSON.stringify({
          postId: entry.comment.post,
          author: {
            displayName: entry.author.displayName,
            photoURL: entry.author.photoURL,
            id: entry.author.id,
            uid: entry.author.uid,
          },
          content: entry.comment.content,
        }),
      },
    }
    await persistNotification(uid, data)

    const badgeCount = await getBadgeCount(uid)
    const fcmPayload = {
      notification: {
        title: `${entry.author.displayName} a réagi à votre commentaire`,
        body: entry.comment.content || 'Audio',
        tag: `comment-${entry.comment.id}-reaction`,
        badge: badgeCount,
      },
    }
    const { successCount } = await firebaseAdmin
      .messaging()
      .sendToDevice(fcmToken, fcmPayload, fcmOptions)

    console.log('Notification successfully sent:', fcmPayload)
    return sendStatus(200, { success: true, count: successCount })
  } catch (error) {
    return sendStatus(400, { errorMessage: error.message })
  }
}

// Handle reaction-related notifications
const handleReactions = async ({ entry }) => {
  const result = entry.comment
    ? await handleCommentReaction(entry)
    : await handlePostReaction(entry)
  return result
}

// Handle reaction-related notifications
const handleComments = async ({ entry }) => {
  const result = entry.post
    ? await handlePostComment(entry)
    : await handleReplyComment(entry)
  return result
}

// Handler
module.exports.create = async (event) => {
  const body = JSON.parse(event.body) || {}
  console.log('Received event', event)

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
