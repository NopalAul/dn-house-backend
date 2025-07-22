import AWS from 'aws-sdk'
import { env } from './env'

export const r2 = new AWS.S3({
  endpoint: env.R2_ENDPOINT,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
})

export const uploadToR2 = async (file: Buffer, fileName: string, contentType: string): Promise<string> => {
  const uploadParams = {
    Bucket: env.R2_BUCKET,
    Key: fileName,
    Body: file,
    ContentType: contentType,
  }

  const result = await r2.upload(uploadParams).promise()
  return result.Location || `${env.R2_ENDPOINT}/${fileName}`
}

export const getPresignedUrl = async (fileName: string, expiresIn: number = 3600): Promise<string> => {
  const params = {
    Bucket: env.R2_BUCKET,
    Key: fileName,
    Expires: expiresIn, // URL expires in seconds (default: 1 hour)
  }

  return new Promise((resolve, reject) => {
    r2.getSignedUrl('getObject', params, (err, url) => {
      if (err) {
        reject(err)
      } else {
        resolve(url)
      }
    })
  })
}
