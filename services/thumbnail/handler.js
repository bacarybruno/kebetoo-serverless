const AWS = require('aws-sdk')
const ffmpeg = require('fluent-ffmpeg')
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
const tmpDir = process.env.TMP_DIR || '/tmp'
const videoPrefix = process.env.VIDEO_PREFIX || 'VID'
const s3BucketThumbnailsKey = process.env.S3_BUCKET_THUMBNAILS_KEY || 'thumbnails'
const assetSize = 480
const imageConfig = {
  size: `?x${assetSize}`,
}
const gifConfig = {
  fps: 5,
  duration: 4,
  speedMultiplier: 1,
  deletePalette: true,
  scale: assetSize,
}

const processedFiles = []
const minCompressionDiff = 500 * 1024 // 500 KB

const getExtension = (src, keepDot) => {
  const ext = path.extname(src.split('?')[0])
  if (keepDot) {
    return ext
  }
  return ext.substr(1)
}

const getFileInfos = (source) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(source, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

const compressVideo = async (source) => {
  const extension = getExtension(source)
  const output = `${tmpDir}/compressed-${Date.now()}.${extension}`;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(source)
      .videoCodec('libx265')
      .outputOptions(['-crf 28'])
      .output(output)
      .on('end', () => resolve(output))
      .on('error', reject)
      .run()
  })
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

const uploadToS3 = ({
  filepath, srcKey, bucket, replace = true, isVideo = false,
}) => {
  const ext = getExtension(filepath)
  let dstKey = srcKey
  if (replace) {
    dstKey = srcKey
      .replace(getExtension(srcKey, true), `.${ext}`)
      .split('/')
    dstKey
      .splice(dstKey.length - 2, 0, `/${s3BucketThumbnailsKey}`)
    dstKey = dstKey
      .join('/')
      .substr(1)
  }

  const params = {
    Bucket: bucket,
    Key: dstKey,
    Body: createReadStream(filepath),
    ContentType: `${isVideo ? 'video' : 'image'}/${ext}`,
  }

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err)
        reject(err)
      }
      console.log(`Successful upload to ${bucket}/${dstKey}`)
      resolve(data)
    })
  })
}

module.exports.generate = async (event, context) => {
  console.log('Received event', event)
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key).replace(/\+/g, ' ')
  if (processedFiles.includes(srcKey)) {
    return sendStatus(400, `The file ${srcKey} is already processed`)
  }
  processedFiles.push(srcKey)

  const bucket = event.Records[0].s3.bucket.name
  const target = s3.getSignedUrl('getObject', { Bucket: bucket, Key: srcKey, Expires: 1000 })
  let fileType = srcKey.match(/\.\w+$/)

  if (!fileType) {
    return sendStatus(400, `Invalid file type found for key: ${srcKey}.`)
  }

  if (!srcKey.startsWith(videoPrefix) && !srcKey.substring(1).startsWith(videoPrefix)) {
    return sendStatus(400, `Invalid file type found for key: ${srcKey}. Key should start with ${videoPrefix}`)
  }

  fileType = fileType[0].substr(1)

  if (!allowedTypes.includes(fileType)) {
    return sendStatus(400, `Invalid filetype. Expected one of ${allowedTypes.join(', ')} but got ${fileType} instead.`)
  }

  const compressedVideo = await compressVideo(target)
  const compressedVideoInfos = await getFileInfos(compressedVideo)
  const originalVideoInfos = await getFileInfos(target)

  const reducedVideoSizeDiff = originalVideoInfos.format.size - compressedVideoInfos.format.size
  if (reducedVideoSizeDiff >= minCompressionDiff) {
    console.log(`Video size reduced by ${reducedVideoSizeDiff / 1024} KB`)
    // video size is reduced by more than 500 KB => upload to s3
    await uploadToS3({
      filepath: compressedVideo,
      srcKey,
      bucket,
      replace: false,
      isVideo: true,
    })
  } else {
    console.log(`Skipping video upload. The size is only reduced by ${reducedVideoSizeDiff / 1024} KB`)
  }

  const gifPath = await createThumbnail(compressedVideo, 'gif')
  await uploadToS3({
    filepath: gifPath,
    srcKey,
    bucket,
  })

  const imagePath = await createThumbnail(compressedVideo, 'png')
  await uploadToS3({
    filepath: imagePath,
    srcKey,
    bucket,
  })

  return sendStatus(200, `Processed ${bucket}/${srcKey} successfully`)
}
