import * as functions from 'firebase-functions';
import { _refWithOptions } from 'firebase-functions/lib/providers/database';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


export const convertToWebp = functions.https.onRequest((req, res) => {
  console.info(req);
  res.status(200).json({
    message: 'OK'
  });
});