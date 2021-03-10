const firebaseAdmin = require('firebase-admin')
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

    const badgeCount = await getBadgeCount(uid)
    const notification = {
      title: `${entry.author.displayName} commented your post`,
      body: entry.content || 'Audio',
      tag: `post-${entry.post.id}-comment`,
      badge: badgeCount,
    }

    const data = {
      type: NOTIFICATION_TYPES.COMMENT,
      payload: JSON.stringify({
        postId: entry.post.id,
        author: entry.author, 
        content: entry.content,
      }),
    }
    await persistNotification(uid, data)

    const fcmPayload = { notification }
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

    const badgeCount = await getBadgeCount(uid)
    const notification = {
      title: `${entry.author.displayName} replied to your comment`,
      body: entry.content || 'Audio',
      tag: `comment-${entry.thread.id}-reply`,
      badge: badgeCount,
    }

    const data = {
      type: NOTIFICATION_TYPES.REPLY,
      payload: JSON.stringify({
        postId: entry.thread.post,
        author: entry.author,
        content: entry.content,
      }),
    }
    await persistNotification(uid, data)

    const fcmPayload = { notification }
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

    const badgeCount = await getBadgeCount(uid)
    const notification = {
      title: `${entry.author.displayName} reacted to your post`,
      body: entry.post.content || getPostType(entry.post),
      tag: `post-${entry.post.id}-reaction`,
      badge: badgeCount,
    }

    const data = {
      type: NOTIFICATION_TYPES.POST_REACTION,
      payload: JSON.stringify({
        postId: entry.post.id,
        author: entry.author,
        content: entry.post.content,
      }),
    }
    await persistNotification(uid, data)

    const fcmPayload = { notification }
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

    const badgeCount = await getBadgeCount(uid)
    const notification = {
      title: `${entry.author.displayName} reacted to your comment`,
      body: entry.comment.content || 'Audio',
      tag: `comment-${entry.comment.id}-reaction`,
      badge: badgeCount,
    }

    const data = {
      type: NOTIFICATION_TYPES.COMMENT_REACTION,
      payload: JSON.stringify({
        postId: entry.comment.post,
        author: entry.author,
        content: entry.comment.content,
      }),
    }
    await persistNotification(uid, data)
  
    const fcmPayload = { notification }
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
