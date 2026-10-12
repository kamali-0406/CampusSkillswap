import { env } from '../config/env';
import { cognitoAuth } from './cognitoAuth';
import { devAuth } from './devAuth';

// One interface, two implementations. Everything else in the app imports `auth` only.
export const auth = env.authMode === 'dev' ? devAuth : cognitoAuth;
