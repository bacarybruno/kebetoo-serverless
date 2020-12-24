const AWS = require('aws-sdk')
const path = require('path')
const { createReadStream } = require('fs')
const { default: ThumbnailGenerator } = require('video-thumbnail-generator')
const { sendStatus } = require('./helpers')

let s3 = new AWS.S3()
if (process.env.IS_OFFLINE === 'true') {
  // serverless-s3-local config
  s3 = new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
    endpoint: new AWS.Endpoint('http://localhost:4569'),
  })
}

const allowedTypes = ['mov', 'mpg', 'mpeg', 'mp4', 'wmv', 'avi', 'webm']
const filePreviewSuffix = process.env.FILE_PREVIEW_SUFFIX || 'preview'
const tmpDir = process.env.TMP_DIR || '/tmp'
const s3BucketVideosKey = process.env.S3_BUCKET_VIDEOS_KEY || 'videos'
const s3BucketThumbnailsKey = process.env.S3_BUCKET_THUMBNAILS_KEY || 'thumbnails'
const assetSize = 480
const imageConfig = {
  size: `?x${assetSize}`,
}
const gifConfig = {
  fps: 5,
  duration: 6,
  speedMultiplier: 1.5,
  deletePalette: true,
  scale: assetSize,
}

const createThumbnail = async (sourcePath, type = 'gif') => {
  const generator = new ThumbnailGenerator({
    sourcePath,
    tmpDir,
    thumbnailPath: tmpDir,
  })
  return new Promise((resolve, reject) => {
    try {
      if (type === 'gif') {
        generator.generateGif(gifConfig).then(resolve)
      } else {
        generator
          .generateOneByPercent(15, imageConfig)
          .then((imagePath) => resolve(path.join(tmpDir, imagePath)))
      }
    } catch (error) {
      reject(error)
    }
  })
}

const uploadToS3 = (filepath, srcKey, bucket, type = 'gif', name = filePreviewSuffix) => {
  const tmpFile = createReadStream(filepath)
  const dstKey = srcKey
    .replace(/\.\w+$/, `-${name}.${type}`)
    .replace(`${s3BucketVideosKey}/`, `${s3BucketThumbnailsKey}/`)
  const params = {
    Bucket: bucket,
    Key: dstKey,
    Body: tmpFile,
    ContentType: `image/${type}`,
  }

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err)
        reject(err)
      }
      console.log(`successful upload to ${bucket}/${dstKey}`)
      resolve(data)
    })
  })
}

module.exports.generate = async (event, context) => {
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key).replace(/\+/g, ' ')
  const bucket = event.Records[0].s3.bucket.name
  const target = s3.getSignedUrl('getObject', { Bucket: bucket, Key: srcKey, Expires: 1000 })
  let fileType = srcKey.match(/\.\w+$/)

  if (!fileType) {
    return sendStatus(400, `Invalid file type found for key: ${srcKey}`)
  }

  fileType = fileType[0].slice(1)

  if (!allowedTypes.includes(fileType)) {
    return sendStatus(400, `Invalid filetype. Expected one of ${allowedTypes.join(', ')} but got ${fileType} instead.`)
  }

  const gifPath = await createThumbnail(target)
  await uploadToS3(gifPath, srcKey, bucket)
  const imagePath = await createThumbnail(target, 'png')
  await uploadToS3(imagePath, srcKey, bucket, 'png')

  return sendStatus(200, `Processed ${bucket}/${srcKey} successfully`)
}
