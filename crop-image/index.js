const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const gm = require('gm')
    .subClass({ imageMagick: true });

const srcBucket = process.env.SRC_BUCKET;
const destBucket = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {

    // let imgName = event.Records[0].s3.object.key;
    let imgName = event.imgName;
    let cropRatio = event.cropRatio;
    console.log(cropRatio);

    readFileFromBucket(srcBucket, imgName).then(response => {
        console.log(response.Body) // content of file
        let img = response.Body
        cropImage(img, cropRatio).then(croppedImg => {
            writeFileToBucket(destBucket, 'cropped_' + imgName, croppedImg, 'image/jpeg').then(response => {
                console.log('Hurah!! success')
                callback(null, JSON.stringify(response))
            }).catch(err => {
                console.log(err.message, 'error in writing to dest')
                callback('error in writing to dest')
            })
        }).catch(err => {
            console.log(err.message, 'error in cropping img')
            callback('error in cropping img')
        })

    }).catch(err => {
        console.log(err, err.message, err.code) // message: 'The specified key does not exist.',code: 'NoSuchKey'
        if (err.code === 'NoSuchKey') {
            // File not found
            callback('No file found')
        }
    })


};

function readFileFromBucket (bucketName, fileName) {
    let params = {
        Bucket: bucketName,
        Key: fileName
    };
    return new Promise(((resolve, reject) => {
        s3.getObject(params, (err, fileData) => {
            if (err) {
                return reject(err)
            } else {
                resolve(fileData)
            }
        })
    }))
}

function writeFileToBucket (bucketName, fileName, content, contentType) {
    let params = {
        Bucket: bucketName,
        Key: fileName,
        Body: content,
        ContentType: contentType
    }
    return new Promise((resolve, reject) => {
        s3.putObject(params, (err, response) => {
            if (err) {
                return reject(err)
            } else {
                return resolve(response)
            }
        })
    })
}

function cropImage(img, cropRatio) {
    let width = cropRatio.x2 - cropRatio.x1
    let height = cropRatio.y2 - cropRatio.y1

    return new Promise((resolve, reject) => {
        console.log('cropping image/jpeg');
        gm(img).crop(width, height, cropRatio.x1, cropRatio.y1)
            .toBuffer('jpg', (err, imgBuffer) => {
                if (err) {
                    return reject(err)
                } else {
                    return resolve(imgBuffer)
                }
            })
    })
}