// Fake sign-up / email-verification / sign-in used ONLY by the local dev server.
// Mirrors the Cognito flow: sign up -> confirm with emailed code -> sign in -> ID token.
// The verification code is always 123456 and is also printed in this terminal.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';

const CODE = '123456';
const accounts = new Map(); // email -> { sub, name, password, confirmed }
const err = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const clean = (v) => String(v || '').trim().toLowerCase();
const strongEnough = (p) => typeof p === 'string' && p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

export function claimsFromAuthHeader(header) {
  const token = String(header || '').replace(/^Bearer\s+/i, '');
  if (!token.startsWith('dev.')) return null;
  try { return JSON.parse(Buffer.from(token.slice(4), 'base64url').toString('utf8')); } catch { return null; }
}

export function devAuthRouter() {
  const r = Router();

  r.post('/signup', (req, res) => {
    const email = clean(req.body.email);
    const name = String(req.body.name || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return err(res, 400, 'InvalidParameterException', 'Enter a valid email address.');
    if (name.length < 2) return err(res, 400, 'InvalidParameterException', 'Enter your name.');
    if (!strongEnough(req.body.password)) return err(res, 400, 'InvalidPasswordException', 'Password needs 8+ characters with upper-case, lower-case and a number.');
    const existing = accounts.get(email);
    if (existing?.confirmed) return err(res, 409, 'UsernameExistsException', 'An account with this email already exists.');
    accounts.set(email, { sub: existing?.sub || randomUUID(), name, password: req.body.password, confirmed: false });
    console.log(`[dev-auth] verification code for ${email}: ${CODE}`);
    res.json({ data: { codeSent: true } });
  });

  r.post('/confirm', (req, res) => {
    const acct = accounts.get(clean(req.body.email));
    if (!acct) return err(res, 404, 'UserNotFoundException', 'No account found for that email.');
    if (String(req.body.code).trim() !== CODE) return err(res, 400, 'CodeMismatchException', 'That verification code is not correct.');
    acct.confirmed = true;
    res.json({ data: { confirmed: true } });
  });

  r.post('/resend', (req, res) => {
    if (!accounts.has(clean(req.body.email))) return err(res, 404, 'UserNotFoundException', 'No account found for that email.');
    console.log(`[dev-auth] verification code for ${clean(req.body.email)}: ${CODE}`);
    res.json({ data: { codeSent: true } });
  });

  r.post('/signin', (req, res) => {
    const email = clean(req.body.email);
    const acct = accounts.get(email);
    if (!acct || acct.password !== req.body.password) return err(res, 401, 'NotAuthorizedException', 'Incorrect email or password.');
    if (!acct.confirmed) return err(res, 403, 'UserNotConfirmedException', 'Please verify your email first.');
    const claims = { sub: acct.sub, email, name: acct.name };
    res.json({ data: { idToken: `dev.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`, user: { id: acct.sub, email, name: acct.name } } });
  });

  r.post('/forgot', (req, res) => {
    const email = clean(req.body.email);
    if (accounts.get(email)?.confirmed) console.log(`[dev-auth] password reset code for ${email}: ${CODE}`);
    res.json({ data: { codeSent: true } }); // same answer either way: do not reveal which emails exist
  });

  r.post('/reset', (req, res) => {
    const acct = accounts.get(clean(req.body.email));
    if (!acct || String(req.body.code).trim() !== CODE) return err(res, 400, 'CodeMismatchException', 'That reset code is not correct.');
    if (!strongEnough(req.body.newPassword)) return err(res, 400, 'InvalidPasswordException', 'Password needs 8+ characters with upper-case, lower-case and a number.');
    acct.password = req.body.newPassword;
    res.json({ data: { reset: true } });
  });

  return r;
}
