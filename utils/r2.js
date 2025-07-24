const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const createR2Client = (env) => {
  return new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
};

const uploadToR2 = async (r2Client, buffer, fileName, contentType, bucketName) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
};

const getPresignedUrl = async (r2Client, fileName, bucketName, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
};

module.exports = {
  createR2Client,
  uploadToR2,
  getPresignedUrl
};
