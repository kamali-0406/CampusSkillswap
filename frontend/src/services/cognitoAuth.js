// AWS Cognito (User Pool) authentication via amazon-cognito-identity-js.
// Flow: signUp -> confirmSignUp (emailed code) -> signIn -> ID token used as the API bearer token.
import {
  CognitoUserPool, CognitoUser, CognitoUserAttribute, AuthenticationDetails
} from 'amazon-cognito-identity-js';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

let pool;
const getPool = () => {
  if (!env.userPoolId || !env.clientId) {
    throw new AppError('CONFIG_MISSING', 'Cognito is not configured. Set the VITE_COGNITO_* values in frontend/.env.local.');
  }
  pool ??= new CognitoUserPool({ UserPoolId: env.userPoolId, ClientId: env.clientId });
  return pool;
};
const userFor = (email) => new CognitoUser({ Username: email.trim().toLowerCase(), Pool: getPool() });
const call = (fn) => new Promise((resolve, reject) => fn((err, result) => (err ? reject(err) : resolve(result))));

const toUser = (session) => {
  const p = session.getIdToken().payload;
  return { id: p.sub, email: p.email, name: p.name || p.email };
};

export const cognitoAuth = {
  signUp: ({ name, email, password }) => call((cb) => getPool().signUp(
    email.trim().toLowerCase(), password,
    [new CognitoUserAttribute({ Name: 'email', Value: email.trim().toLowerCase() }), new CognitoUserAttribute({ Name: 'name', Value: name.trim() })],
    [], cb
  )),
  confirmSignUp: ({ email, code }) => call((cb) => userFor(email).confirmRegistration(code.trim(), true, cb)),
  resendCode: (email) => call((cb) => userFor(email).resendConfirmationCode(cb)),

  signIn: ({ email, password }) => new Promise((resolve, reject) => {
    const details = new AuthenticationDetails({ Username: email.trim().toLowerCase(), Password: password });
    userFor(email).authenticateUser(details, {
      onSuccess: (session) => resolve({ user: toUser(session), idToken: session.getIdToken().getJwtToken() }),
      onFailure: reject,
      newPasswordRequired: () => reject(new AppError('NEW_PASSWORD_REQUIRED', 'This account needs a new password. Use "Forgot password" to set one.'))
    });
  }),

  /** Restores a previous session (refreshing tokens when needed). Resolves null when signed out. */
  getSession: () => new Promise((resolve) => {
    const current = getPool().getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err, session) => (err || !session?.isValid() ? resolve(null) : resolve({ user: toUser(session), idToken: session.getIdToken().getJwtToken() })));
  }),
  async getIdToken() { return (await this.getSession())?.idToken ?? null; },

  signOut: async () => { getPool().getCurrentUser()?.signOut(); },

  forgotPassword: (email) => new Promise((resolve, reject) => {
    userFor(email).forgotPassword({ onSuccess: resolve, onFailure: reject });
  }),
  resetPassword: ({ email, code, newPassword }) => new Promise((resolve, reject) => {
    userFor(email).confirmPassword(code.trim(), newPassword, { onSuccess: resolve, onFailure: reject });
  })
};
