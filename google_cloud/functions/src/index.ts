import { https, storage } from 'firebase-functions';

import { flag_validate as flag_validate_f } from './handlers/flag_validate';
import { site_deploy as site_deploy_f } from './handlers/site_deploy';

export const flag_validate = https.onRequest(flag_validate_f)
export const site_deploy = storage.bucket("anti-ctf--site_deploy").object().onFinalize(site_deploy_f)