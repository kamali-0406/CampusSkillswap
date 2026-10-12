export class AppError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const COGNITO_MESSAGES = {
  UsernameExistsException: 'An account with this email already exists. Try signing in instead.',
  CodeMismatchException: 'That verification code is not correct. Check the code and try again.',
  ExpiredCodeException: 'That code has expired. Request a new one.',
  NotAuthorizedException: 'Incorrect email or password.',
  UserNotConfirmedException: 'Please verify your email before signing in.',
  UserNotFoundException: 'We could not find an account with that email.',
  InvalidPasswordException: 'Password needs at least 8 characters with upper-case, lower-case and a number.',
  InvalidParameterException: 'Some of the details you entered are not valid. Please check and try again.',
  LimitExceededException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyFailedAttemptsException: 'Too many attempts. Please wait a few minutes and try again.',
  NetworkError: 'Network problem. Check your connection and try again.'
};

/** Turns any thrown value (Cognito, fetch, API) into a message safe to show users. */
export function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.';
  if (err instanceof AppError) return err.message;
  if (COGNITO_MESSAGES[err.code || err.name]) return COGNITO_MESSAGES[err.code || err.name];
  return 'Something went wrong. Please try again.';
}

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_HINT = 'At least 8 characters with upper-case, lower-case and a number.';
