import { Response } from "express";

export const internalServerError = (response: Response, error: Error) => {
    const errorRefrence = guid()

    console.error(`[${errorRefrence}] ${error}`)

    response.status(500).json({ ok: false, error: `Internal server error`, refrence: errorRefrence })
}

function guid() {
    return "ssss".replace(/s/g, s4);
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
