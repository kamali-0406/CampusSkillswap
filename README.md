# Campus SkillSwap

A student skill-exchange platform. Students list **any** skill they can teach and **any** skill they want to learn, get matched with
classmates whose lists fit, send exchange requests, track their status and rate each other afterwards.

> Student A teaches Python and wants Java. Student B teaches Java and wants Python. They are a **100% mutual match**.

The code is designed for an AWS serverless deployment (Cognito, API Gateway, Lambda, DynamoDB, Amplify/CloudFront, SNS, CloudWatch, IAM)
but **runs locally with no AWS account**. No AWS resources are created by this repository, and no AWS keys are needed or stored.

## Features

* Sign up -> **email verification code** -> sign in; forgot / reset password; sign out (Cognito flow)
* Dashboard (skills offered/wanted, pending/accepted/completed counts, recent activity, quick actions)
* Profile (name, email, student ID, bio, skills) and My Skills (add / edit / remove, free text, case-insensitive)
* Find Skills: match cards with match %, matched skills on both sides, search box, empty states
* Exchange Requests: incoming (accept / reject) and sent (status), instant UI update, "mark as completed"
* Ratings & Feedback: 1-5 stars + comment after a completed exchange; received and given feedback
* Loading, empty, success and error states everywhere; responsive from phone to desktop; dark navy theme

## Architecture

```
Browser (React + Vite)
   |  Cognito sign-up / sign-in (amazon-cognito-identity-js)  ->  Amazon Cognito User Pool
   |  HTTPS + "Authorization: Bearer <ID token>"
   v
API Gateway (HTTP API, JWT authorizer = Cognito)
   v
Lambda x5: users | skills | matching | requests | ratings     -> CloudWatch Logs
   v                                    \-> SNS topic (optional notifications)
DynamoDB (single table, on-demand)
Hosting: Amplify Hosting (or S3) + CloudFront, optional Route 53 domain
```

Locally, `backend/local-server` runs the **same Lambda handlers** behind Express, with an in-memory store and a fake auth service.

## Technology stack

React 18, React Router 6, Vite 5, plain CSS - amazon-cognito-identity-js - Node.js 20+ (ES modules), AWS SDK v3, esbuild.

## Folder structure

```
CampusSkillSwap/
├── frontend/                React + Vite app
│   └── src/ components/ pages/ services/ context/ hooks/ utils/ config/
├── backend/
│   ├── lambdas/             users | skills | matching | requests | ratings  (thin route tables)
│   ├── services/            business logic + repositories (dynamo / memory) + SNS notifier
│   ├── utils/               matching.js, skills.js, http.js (router/errors), logger.js
│   ├── local-server/        Express adapter + fake auth (development only)
│   ├── scripts/             build-lambdas.mjs  ->  dist/*.zip
│   └── test/                node:test unit + flow tests
├── infrastructure/          setup guide, DynamoDB design, IAM policy template (docs only)
├── .github/workflows/ci.yml
└── README.md
```

## Local setup (no AWS needed)

Requires Node.js 20 or newer.

```bash
npm run install:all     # installs root, backend and frontend dependencies
npm run dev             # starts API on :4000 and the web app on :5173
```

Open http://localhost:5173, create an account, and enter **123456** as the verification code (the local server also prints it in the terminal).
Four demo students are pre-loaded so Find Skills has something to show. Data lives in memory and resets when the API restarts.

Or run them separately:

```bash
cd backend  && npm install && npm run dev     # http://localhost:4000
cd frontend && npm install && npm run dev     # http://localhost:5173
```

Tests: `npm test` (backend). Production build: `npm run build`.

## Environment variables

Frontend (`frontend/.env.local`, see `.env.example`) - all public identifiers, never secrets:

| Variable | Meaning |
|---|---|
| `VITE_AWS_REGION` | Region of your Cognito pool |
| `VITE_COGNITO_USER_POOL_ID` | User pool ID |
| `VITE_COGNITO_CLIENT_ID` | App client ID (client **without** secret) |
| `VITE_API_BASE_URL` | API Gateway invoke URL, no trailing slash |
| `VITE_AUTH_MODE` | optional: `cognito` or `dev`. Default: Cognito if the pool values are set, otherwise local demo auth in `npm run dev` |

Backend (Lambda environment, see `backend/.env.example`): `DATA_STORE` (`dynamodb` | `memory`), `TABLE_NAME`, `SNS_TOPIC_ARN` (optional), `ALLOWED_ORIGIN` (optional).

Once the four `VITE_*` values are set, the app talks to real Cognito and your API instead of the local demo services.

## AWS integration points

| Place in code | What to connect |
|---|---|
| `frontend/src/services/cognitoAuth.js` | Cognito User Pool (sign-up, confirm, sign-in, reset) |
| `frontend/src/services/apiClient.js` / `api.js` | API Gateway URL; sends the Cognito ID token |
| `backend/utils/http.js` -> `getCaller` | Reads the user from the JWT claims API Gateway validated |
| `backend/services/dynamoRepository.js` | DynamoDB table (`TABLE_NAME`) |
| `backend/services/notifier.js` | SNS topic (`SNS_TOPIC_ARN`) |
| `backend/utils/logger.js` | JSON logs to CloudWatch |
| `backend/scripts/build-lambdas.mjs` | Produces the Lambda zips |

Step-by-step resource setup: [`infrastructure/README.md`](infrastructure/README.md).

## AWS Services Used

| Service | Role in this project |
|---|---|
| **Amazon Cognito** | Sign-up, email verification, sign-in, password reset; issues the JWT used to call the API |
| **Amazon API Gateway** | Public HTTPS entry point; validates the Cognito JWT before any Lambda runs; CORS |
| **AWS Lambda** | Runs the five backend functions (users, skills, matching, requests, ratings) |
| **Amazon DynamoDB** | Stores profiles, skills, requests, status and ratings |
| **AWS Amplify Hosting / S3** | Hosts the built React app (Amplify also builds from GitHub) |
| **Amazon CloudFront** | CDN/HTTPS in front of the site (included with Amplify, or configured with S3) |
| **Amazon SNS** | Receives exchange events (created / accepted / rejected / completed) published by the requests Lambda |
| **Amazon CloudWatch** | Collects Lambda JSON logs; optional alarms on errors and cost |
| **AWS IAM** | One least-privilege execution role for the Lambdas (template provided) |
| **Amazon Route 53** *(optional)* | Custom domain name |
| **GitHub Actions / CodePipeline** *(optional)* | CI workflow included (`ci.yml`); deployment automation is yours to add |

## DynamoDB data model

Single table with `PK`/`SK` and two GSIs (`GSI1`, `GSI2`). Profile and skills share the partition `USER#<sub>`; requests and ratings are
their own items, indexed by sender (GSI1) and recipient (GSI2). Full table in [`infrastructure/README.md`](infrastructure/README.md).
Status changes use a **conditional update**, so a request can only move `Pending -> Accepted/Rejected` or `Accepted -> Completed` once, even with two clicks at the same time.

## Cognito integration

`frontend/src/services/authService.js` exposes one interface (`signUp`, `confirmSignUp`, `resendCode`, `signIn`, `signOut`, `forgotPassword`, `resetPassword`, `getSession`).
`cognitoAuth.js` implements it with the Cognito SDK; `devAuth.js` implements it against the local server. The ID token is sent as the bearer token; the API reads
`sub`, `email` and `name` from its claims. The first authenticated call creates the user's profile automatically.

## API endpoints

All routes require `Authorization: Bearer <ID token>`. Success: `{ "data": ... }`. Error: `{ "error": { "code", "message" } }`.

| Method & path | Purpose |
|---|---|
| `GET /users` | Directory of other students (no emails) |
| `GET /users/me`, `PUT /users/me` | Own profile with skills / update name, studentId, bio |
| `GET /users/{id}` | Public profile of a student |
| `GET /skills` | Own skills |
| `POST /skills` `{type:"teach"\|"learn", name}` | Add a skill (duplicates rejected case-insensitively) |
| `PUT /skills/{id}` `{name}` | Rename own skill |
| `DELETE /skills/{id}` | Remove own skill |
| `GET /matches` | Compatible students with match %, best first |
| `GET /matches/{userId}` | Match details with one student |
| `GET /requests/sent`, `GET /requests/received` | Own requests |
| `POST /requests` `{toUserId, offeredSkills[], requestedSkills[], message?}` | Send a request |
| `PUT /requests/{id}/accept` / `reject` | Recipient only, pending requests only |
| `PUT /requests/{id}/complete` | Either participant, accepted requests only |
| `GET /ratings` | Received, given, average |
| `POST /ratings` `{requestId, rating:1-5, feedback?}` | Rate a completed exchange once |

## Matching algorithm

Lives in `backend/utils/matching.js` (one function, `computeMatch`), with skill normalisation in `backend/utils/skills.js`
(trim, collapse spaces, lower-case, so `"python"`, `" Python "` and `"PYTHON"` are equal). Skills are free text, never a fixed list.

```
youCanLearn  = my learn list    ∩ their teach list
theyCanLearn = their learn list ∩ my teach list
percentage   = round( 50% * |youCanLearn|/|my learn list| + 50% * |theyCanLearn|/|their learn list| )
```

* **mutual** - both directions overlap (A: Python/Java vs B: Java/Python = **100%**)
* **partial** - only one direction overlaps (at most 50%)
* no overlap - not shown

Change `WEIGHTS` or the formula in that file; the UI just displays what the API returns.

## Request workflow

```
Pending --accept--> Accepted --complete--> Completed --> both sides can rate once
   \--reject--> Rejected
```

Rules enforced on the server: no request to yourself; offered skills must be ones you teach and requested ones must be taught by the recipient;
no second open (pending/accepted) request between the same two students, in either direction; only the recipient can accept/reject; only participants can complete or rate.

## Security notes

No secrets in the repo (`.env*` ignored except `.env.example`); input validated and length-limited in the services; identity always comes from the validated JWT, never from the request body;
emails are never returned to other users; error responses are generic (details go to CloudWatch only). The local fake auth server is for development only and must not be deployed.

## Deployment guidance

1. Create the resources following [`infrastructure/README.md`](infrastructure/README.md) (DynamoDB -> Cognito -> Lambdas -> API Gateway -> hosting).
2. `cd backend && npm run build:lambdas` and upload each `dist/<name>.zip` to its Lambda.
3. Set the four `VITE_*` variables in Amplify (or `.env.local` for a local test against real AWS), then deploy the frontend.
4. Create an AWS Budget alert, and delete resources when you are done to avoid charges.

## Known limitations

* Notifications go to an SNS topic, not to each student's own inbox (that needs SES or SNS filter policies).
* Matching reads all profiles with a `Scan`: fine for a campus, replace with an index for thousands of users.
* Ratings do not update a stored average; it is calculated when read.
