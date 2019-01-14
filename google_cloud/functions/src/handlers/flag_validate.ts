import { Request, Response } from 'express';
import * as firebase from 'firebase-admin';

import { internalServerError } from '../error';

firebase.initializeApp()

export const flag_validate = async (request: Request, response: Response) => {
    if (!request.body.userToken) {
        response.status(400).json({ ok: false, error: "User token not supplied." })
        return
    }

    if (!request.body.challengeID) {
        response.status(400).json({ ok: false, error: "Challenge id not supplied." })
        return
    }

    if (!request.body.flag) {
        response.status(400).json({ ok: false, error: "Flag not supplied." })
        return
    }

    let token: firebase.auth.DecodedIdToken;

    try {
        token = await firebase.auth().verifyIdToken(request.body.userToken)
    } catch (err) {
        response.status(401).json({ ok: false, error: "User token not valid." })
        return
    }

    let data: any;

    try {
        const snapshot = await firebase.firestore().collection("challenges").doc(request.body.challengeID).get()
        data = snapshot.data()

        if (!snapshot.exists || data === undefined) {
            response.status(404).json({ ok: false, error: "Challenge does not exist." })
            return
        }
    } catch (err) {
        internalServerError(response, err)
        return
    }

    if (data.flag !== request.body.flag) {
        response.status(400).json({ ok: false, error: "Flag is not correct." })
        return
    }
    try {
        await firebase.firestore().collection("users").doc(token.uid).update({
            [`challenges.${request.body.challengeID}`]: new Date(),
        })
    } catch (err) {
        internalServerError(response, err)
        return
    }

    response.status(200).json({ ok: true })
}