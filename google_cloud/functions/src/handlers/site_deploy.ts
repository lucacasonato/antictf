import * as admin from 'firebase-admin';
import { config, storage, EventContext } from 'firebase-functions';
import * as NetlifyAPI from 'netlify';
import { unzip } from 'zip-unzip-promise';

const ntlfy = new NetlifyAPI(config().netlify)

export const site_deploy = async (objectMetadata: storage.ObjectMetadata, context: EventContext) => {
    if (objectMetadata.contentType !== "application/zip") {
        return "not a zip"
    }

    if (!objectMetadata.metadata || !objectMetadata.metadata.site) {
        return "site not supplied"
    }

    if ((await admin.auth().getUser(objectMetadata.owner.entityId)).customClaims["admin"] !== true) {
        return "uploader not an admin"
    }

    const siteDoc = admin.firestore().collection("sites").doc(objectMetadata.metadata.site)
    const deployDoc = siteDoc.collection("deploys").doc(objectMetadata.name.replace(/\.[^/.]+$/, ""))

    const siteInfo = await siteDoc.get()

    await deployDoc.update({
        status: "starting",
        startedAt: new Date(),
    })

    let netlifyID = siteInfo.data().netlifyID

    if (!siteInfo.data().created) {
        try {
            const resp = await ntlfy.createSite({
                configure_dns: true,
                body: {
                    name: siteInfo.id,
                    custom_domain: `${siteInfo.id.toLowerCase()}.web.antictf.ml`,
                    managed_dns: true,
                    ssl: true,
                    force_ssl: true,
                    processing_settings: {
                        css: {
                            bundle: true,
                            minify: true
                        },
                        js: {
                            bundle: true,
                            minify: true
                        },
                        html: {
                            pretty_urls: true,
                            canonical_urls: true
                        },
                        images: {
                            optimize: true
                        }
                    }
                }
            })

            await siteDoc.update({
                created: true,
                netlifyID: resp.id,
                netlifyURL: resp.admin_url,
                url: resp.url,
            })

            netlifyID = resp.id
        } catch (err) {
            console.log(err)
            return err
        }
    }

    await deployDoc.update({
        status: "downloading",
    })

    try {
        const r = await admin.storage().bucket(objectMetadata.bucket).file(objectMetadata.name).download({
            destination: "/tmp/antictf-site.zip"
        })

        console.log(r)
    } catch (err) {
        console.log(err)
        return err
    }

    await deployDoc.update({
        status: "unzipping",
    })

    const dirPath = await unzip('/tmp/antictf-site.zip', '/tmp/antictf-site');

    await deployDoc.update({
        status: "uploading",
    })

    try {
        const r = await ntlfy.deploy(netlifyID, "/tmp/antictf-site")

        console.log(r)
    } catch (err) {
        console.log(err)
        return err
    }

    await deployDoc.update({
        status: "deployed",
        finishedAt: new Date(),
    })

    return ""
}