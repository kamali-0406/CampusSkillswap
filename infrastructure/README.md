# Infrastructure guide

This folder contains **documentation and templates only**. Nothing here creates AWS resources, and no AWS
credentials are needed to run the project locally. Create the resources yourself, in this order, and keep
everything on on-demand / free-tier friendly settings.

## 1. DynamoDB (one table)

| Setting | Value |
|---|---|
| Table name | your choice, e.g. `CampusSkillSwap` (goes into the Lambda env var `TABLE_NAME`) |
| Partition key | `PK` (String) |
| Sort key | `SK` (String) |
| Capacity | **On-demand** (pay per request, no idle cost) |
| GSI `GSI1` | partition `GSI1PK` (String), sort `GSI1SK` (String), projection **All** |
| GSI `GSI2` | partition `GSI2PK` (String), sort `GSI2SK` (String), projection **All** |

**Item types**

| Entity | PK | SK | GSI1 (PK / SK) | GSI2 (PK / SK) | Main attributes |
|---|---|---|---|---|---|
| Profile (user) | `USER#<cognito sub>` | `PROFILE` | – | – | name, email, studentId, bio |
| Skill | `USER#<sub>` | `SKILL#<skillId>` | – | – | type (`teach`/`learn`), name, key (lower-case) |
| Exchange request | `REQUEST#<id>` | `META` | `SENT#<fromId>` / createdAt | `RECV#<toId>` / createdAt | fromUserId, toUserId, offeredSkills[], requestedSkills[], status, message |
| Rating | `RATING#<id>` | `META` | `GIVEN#<fromId>` / createdAt | `GOT#<toId>` / createdAt | requestId, rating (1-5), feedback |

All items also carry an `entityType` attribute (`PROFILE`, `SKILL`, `REQUEST`, `RATING`). Matching loads profiles and
skills with a filtered `Scan`, which is fine for a campus-sized dataset. For a large user base, replace it with a GSI.

## 2. Cognito User Pool

1. Create a user pool; sign-in option **Email**; self-registration **on**.
2. Required attributes: `email` and `name`. Verification: **email, send code** (do not disable it).
3. Password policy: at least 8 characters with upper-case, lower-case and a number (matches the UI hints).
4. Create an **app client of type "Single-page application / public client" with NO client secret**.
   Enable `ALLOW_USER_SRP_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`.
5. Put the Region, User Pool ID and App Client ID in `frontend/.env.local` (see `frontend/.env.example`).
   These are public identifiers, not secrets.

## 3. Lambda functions (5)

Build the deployable bundles: `cd backend && npm install && npm run build:lambdas` -> `backend/dist/*.zip`.

| Function | Zip | Handler |
|---|---|---|
| users | `users.zip` | `index.handler` |
| skills | `skills.zip` | `index.handler` |
| matching | `matching.zip` | `index.handler` |
| requests | `requests.zip` | `index.handler` |
| ratings | `ratings.zip` | `index.handler` |

Runtime **Node.js 20.x** (or newer), architecture arm64 is cheapest, memory 256 MB, timeout 10 s.
Environment variables: `DATA_STORE=dynamodb`, `TABLE_NAME=<table>`, optional `SNS_TOPIC_ARN`.
Execution role: basic Lambda logging (`AWSLambdaBasicExecutionRole`) plus the policy in
`iam-lambda-policy.template.json` (fill in the placeholders). That is the whole IAM story: one least-privilege role.

## 4. API Gateway (HTTP API, cheapest option)

1. Create an **HTTP API**. Add a **JWT authorizer**: issuer `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`, audience = your App Client ID, identity source `$request.header.Authorization`.
2. Attach the authorizer to all routes below. Each Lambda is called through a Lambda integration (payload format 2.0).
3. Enable **CORS** on the API: allowed origin = your Amplify/CloudFront URL (and `http://localhost:5173` while developing), headers `authorization, content-type`, methods `GET, POST, PUT, DELETE, OPTIONS`.
4. Put the API **invoke URL** in `VITE_API_BASE_URL`.

| Route | Lambda |
|---|---|
| `GET /users`, `GET /users/me`, `PUT /users/me`, `GET /users/{id}` | users |
| `GET /skills`, `POST /skills`, `PUT /skills/{id}`, `DELETE /skills/{id}` | skills |
| `GET /matches`, `GET /matches/{userId}` | matching |
| `GET /requests/sent`, `GET /requests/received`, `POST /requests`, `PUT /requests/{requestId}/accept`, `PUT /requests/{requestId}/reject`, `PUT /requests/{requestId}/complete` | requests |
| `GET /ratings`, `POST /ratings` | ratings |

## 5. Frontend hosting

* **Amplify Hosting** (simplest): connect the GitHub repo, app root `frontend`, it picks up `frontend/amplify.yml`. Add the four `VITE_*` variables in the Amplify console. Add a rewrite rule `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>` -> `/index.html` (200) for client-side routing.
  Amplify serves through CloudFront automatically.
* **S3 + CloudFront** alternative: `npm run build`, upload `frontend/dist` to a private bucket, serve with CloudFront (Origin Access Control), and map error 403/404 to `/index.html`.
* **Route 53** (optional, costs a monthly hosted-zone fee plus domain): point a custom domain at Amplify/CloudFront.

## 6. SNS, CloudWatch

* **SNS**: create a standard topic, subscribe your email, and set `SNS_TOPIC_ARN` on the `requests` Lambda. The Lambda then publishes events
  (`REQUEST_CREATED`, `REQUEST_ACCEPTED`, `REQUEST_REJECTED`, `EXCHANGE_COMPLETED`) with the attributes `eventType` and `recipientUserId`.
  A topic email subscription delivers every event to the subscribed address (good for an admin/demo inbox). Sending each student *their own* email would
  need Amazon SES or per-user filter policies, which is intentionally not faked here.
* **CloudWatch**: Lambda logs are JSON lines, so Logs Insights queries such as `fields @timestamp, message, name | filter level = "error"` work out of the box.
  Optional: an alarm on Lambda `Errors` and API Gateway `5xx`, and a billing alarm for your account.

## 7. CI/CD

`.github/workflows/ci.yml` runs the backend tests and builds both parts on every push. For deployment either use Amplify's built-in
GitHub integration (no extra setup) or add AWS CodePipeline/CodeBuild later. Do not commit AWS keys; use GitHub OIDC roles if you add a deploy job.

## Cost notes

Everything above is serverless and pay-per-use: no EC2, no NAT gateway, no load balancer, no provisioned database capacity.
Set an AWS Budget alert before you start, and delete the resources when the course ends.
