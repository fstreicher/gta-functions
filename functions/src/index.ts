import * as functions from 'firebase-functions';
import * as os from 'os';
import * as path from 'path';
import * as sharp from 'sharp';
import { v5 } from 'uuid';
import { FirebaseRegions, HttpMethod, UUID_NAME, UUID_NAMESPACE } from './utils.const';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((req, res) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const convertToWebp = functions
  .region(FirebaseRegions.FRANKFURT)
  .https
  .onRequest(async (req, res) => {
    // allow CORS
    res.set('Access-Control-Allow-Origin', '*');

    // deny anything but POST requests
    if (req.method !== HttpMethod.POST) {
      res.status(405).json({ message: 'This endpoint only accepts POST requests' });
      return;
    }

    // only accept images
    if (req.headers?.['content-type'] !== 'image/png' && req.headers?.['content-type'] !== 'image/jpeg') {
      res.status(415).json({ message: 'This endpoint only accepts content types image/png and image/jpeg' });
      return;
    }

    const uuid = v5(UUID_NAME, UUID_NAMESPACE);
    const tmpFilePath = path.join(os.tmpdir(), uuid);
    const imgBuffer = await sharp(req.body).webp().toBuffer();
    const imgBase64 = imgBuffer.toString('base64');

    const metaWebp = await sharp(imgBuffer).metadata();

    res.status(200).json({
      message: 'OK',
      debug: {
        method: req.method,
        bodyMeta: {
          initialSize: req.headers['content-length'],
          raw: metaWebp
        },
        header: req.headers,
        image: imgBase64
      }
    });
  });