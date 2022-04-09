import * as functions from 'firebase-functions';
import * as sharp from 'sharp';
import { v4 } from 'uuid';
import { FirebaseRegions, HTTPMethod } from './utils.const';
import { Storage } from '@google-cloud/storage';

// const DIR = 'staging';
const DIR = 'location-images';

const options = {
  memory: '1GB' as '1GB'
}

export const convertToWebp = functions
  .region(FirebaseRegions.FRANKFURT)
  .runWith(options)
  .https
  .onRequest(async (req, res) => {
    // allow CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    functions.logger.debug(req.method, req.headers);

    // handle preflight requests
    if (req.method === HTTPMethod.OPTIONS) {
      res.status(200).send();
      return;
    }

    // deny anything but POST requests
    if (req.method !== HTTPMethod.POST) {
      res.status(405).json({ message: 'This endpoint only accepts POST requests' });
      return;
    }

    // only accept images
    if (!req.headers?.['content-type'] || (req.headers?.['content-type'] !== 'image/png' && req.headers?.['content-type'] !== 'image/jpeg')) {
      res.status(415).json({ message: 'This endpoint only accepts content types \'image/png\' and \'image/jpeg\'' });
      return;
    }

    functions.logger.debug('Checks passed, continue processing...');

    // create storage file handler
    const filename = `${v4()}.webp`;
    const file = new Storage().bucket('gta-dashboard.appspot.com').file(`${DIR}/${filename}`);

    convertImage(req.body)
      .then(buffer => {
        // upload buffer to bucket
        file.save(buffer, { resumable: false, metadata: { cacheControl: 'public, max-age=2562000' } })
          .then(_ => {
            res.status(201).send({ filename: filename });
          })
          .catch(err => res.status(500).send(err));
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

export const convertAndBlur = functions
  .region(FirebaseRegions.FRANKFURT)
  .runWith(options)
  .https
  .onRequest(async (req, res) => {
    // allow CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    functions.logger.debug(req.method, req.headers);

    // handle preflight requests
    if (req.method === HTTPMethod.OPTIONS) {
      res.status(200).send();
      return;
    }

    // deny anything but POST requests
    if (req.method !== HTTPMethod.POST) {
      res.status(405).json({ message: 'This endpoint only accepts POST requests' });
      return;
    }

    // only accept images
    if (!req.headers?.['content-type'] || (req.headers?.['content-type'] !== 'image/png' && req.headers?.['content-type'] !== 'image/jpeg')) {
      res.status(415).json({ message: 'This endpoint only accepts content types \'image/png\' and \'image/jpeg\'' });
      return;
    }

    functions.logger.debug('Checks passed, continue processing...');

    // create storage file handler
    const filename = `${v4()}.webp`;
    const file = new Storage().bucket('gta-dashboard.appspot.com').file(`${DIR}/${filename}`);

    convertImage(req.body, true)
      .then(buffer => {
        // upload buffer to bucket
        file.save(buffer, { resumable: false, metadata: { cacheControl: 'public, max-age=2562000' } })
          .then(_ => {
            res.status(201).send({ filename: filename });
          })
          .catch(err => res.status(500).send(err));
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

export const deleteImage = functions
  .region(FirebaseRegions.FRANKFURT)
  .https
  .onRequest((req, res) => {
    // allow CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    functions.logger.debug(req.method, req.headers);

    // handle preflight requests
    if (req.method === HTTPMethod.OPTIONS) {
      res.status(200).send();
      return;
    }

    // deny anything but POST requests
    if (req.method !== HTTPMethod.DELETE) {
      res.status(405).json({ message: 'This endpoint only accepts DELETE requests' });
      return;
    }
    const PARAM_REGEX = /(\/[\w\d-_]+)*\/([\w\d-]+\.\w{3,})/;

    if (!PARAM_REGEX.exec(req.path)) {
      res.status(400).send(`Invalid parameter: ${req.path}`);
      return;
    }

    const pathParams = req.path.split('/').filter(Boolean);
    // FIXME this is not nice, replace with full file path from caller
    pathParams.unshift(DIR);
    const file = new Storage().bucket('gta-dashboard.appspot.com').file(pathParams.join('/'));
    file.delete()
      .then(result => {
        res.status(200).send(result);
      })
      .catch(err => {
        res.status(500).send(err);
      });

  });


async function convertImage(image: any, blurFlag: boolean = false): Promise<Buffer> {

  const originalImage = sharp(image);
  const metadata = await originalImage.metadata();
  const mapHeight = Math.floor(metadata.height / 4.8);
  const compositeLayers: Array<sharp.OverlayOptions> = [];

  if (blurFlag) {
    // crop minimap and blur
    const miniMapSingle = await sharp(image)
      .extract({
        top: metadata.height - mapHeight,
        left: 0,
        height: mapHeight,
        width: Math.floor(mapHeight * 3 / 2)
      })
      .blur(30)
      .webp()
      .toBuffer();

    compositeLayers.push({ input: miniMapSingle, gravity: 'southwest' });
  }

  // composite blurred minimap onto original image
  return originalImage
    .composite(compositeLayers)
    .webp()
    .toBuffer();
}
