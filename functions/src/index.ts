import * as functions from 'firebase-functions';
import * as sharp from 'sharp';
import { v4 } from 'uuid';
import { FirebaseRegions, HTTPMethod } from './utils.const';
import { Storage } from '@google-cloud/storage';

export const convertToWebp = functions
  .region(FirebaseRegions.FRANKFURT)
  .https
  .onRequest(async (req, res) => {
    // allow CORS
    res.set('Access-Control-Allow-Origin', '*');

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

    // create Storage file handler
    const filename = `${v4()}.webp`;
    const file = new Storage().bucket('gta-dashboard.appspot.com').file(`staging/${filename}`);

    // convert buffer to webp
    sharp(req.body).webp().toBuffer()
      .then(buffer => {
        // upload buffer to bucket
        file.save(buffer, { resumable: false })
          .then(_ => {
            res.status(200).send({ filename: filename });
          })
          .catch(err => res.status(500).send(err));
      })
      .catch(err => {
        res.status(500).send(err);
      });

  });