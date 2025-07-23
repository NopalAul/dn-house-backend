"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUrl = exports.uploadToR2 = exports.r2 = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const env_1 = require("../env");
exports.r2 = new aws_sdk_1.default.S3({
    endpoint: env_1.env.R2_ENDPOINT,
    accessKeyId: env_1.env.R2_ACCESS_KEY_ID,
    secretAccessKey: env_1.env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    signatureVersion: 'v4',
});
const uploadToR2 = (file, fileName, contentType) => __awaiter(void 0, void 0, void 0, function* () {
    const uploadParams = {
        Bucket: env_1.env.R2_BUCKET,
        Key: fileName,
        Body: file,
        ContentType: contentType,
    };
    const result = yield exports.r2.upload(uploadParams).promise();
    return result.Location || `${env_1.env.R2_ENDPOINT}/${fileName}`;
});
exports.uploadToR2 = uploadToR2;
const getPresignedUrl = (fileName_1, ...args_1) => __awaiter(void 0, [fileName_1, ...args_1], void 0, function* (fileName, expiresIn = 3600) {
    const params = {
        Bucket: env_1.env.R2_BUCKET,
        Key: fileName,
        Expires: expiresIn, // URL expires in seconds (default: 1 hour)
    };
    return new Promise((resolve, reject) => {
        exports.r2.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(url);
            }
        });
    });
});
exports.getPresignedUrl = getPresignedUrl;
