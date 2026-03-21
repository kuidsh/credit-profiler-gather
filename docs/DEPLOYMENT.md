# Deployment Guide – Perfilador Express

Stack: **React + Vite** (frontend) + **Express** proxy server (backend) + **DeepSeek API**.

The build produces static files (`dist/`) served by Nginx. The Express server (`server/index.cjs`) runs as a background process proxying `/api/analyze` to DeepSeek.

---

## Part 1 — Amazon Linux EC2 (fresh instance)

### 1. Connect to the instance

```bash
ssh -i your-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>
```

### 2. Update system and install Node.js 20

```bash
sudo dnf update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs git
node -v   # should print v20.x.x
```

### 3. Install Nginx and PM2

```bash
sudo dnf install -y nginx
sudo npm install -g pm2
```

### 4. Clone the repository

```bash
cd /home/ec2-user
git clone https://github.com/<your-org>/PerfiladorCredito.git
cd PerfiladorCredito
```

> If you don't have a GitHub repo yet, use `scp` or `rsync` to upload the project folder instead.

### 5. Install dependencies

```bash
npm install
```

### 6. Create the environment file

```bash
nano .env.local
```

Paste and save:

```
DEEPSEEK_API_KEY=your-real-deepseek-api-key-here
```

### 7. Build the frontend

```bash
npm run build
# Output goes to ./dist/
```

### 8. Configure Nginx

```bash
sudo nano /etc/nginx/conf.d/perfilador.conf
```

Paste:

```nginx
server {
    listen 80;
    server_name _;   # replace with your domain if you have one

    # Serve the React build
    root /home/ec2-user/PerfiladorCredito/dist;
    index index.html;

    # React Router: always serve index.html for unknown paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the Express server
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }
}
```

Test and start Nginx:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 9. Start the Express server with PM2

```bash
pm2 start server/index.cjs --name perfilador-api
pm2 save
pm2 startup   # copy & run the command it prints to auto-start on reboot
```

Check it's running:

```bash
pm2 status
pm2 logs perfilador-api
```

### 10. Open firewall ports

In the AWS console → EC2 → Security Groups → Inbound rules, add:

| Type  | Port | Source    |
|-------|------|-----------|
| HTTP  | 80   | 0.0.0.0/0 |
| HTTPS | 443  | 0.0.0.0/0 |

The app is now live at `http://<YOUR_EC2_PUBLIC_IP>`.

### Optional: HTTPS with Let's Encrypt

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

---

## Part 2 — Serverless on AWS (via GitHub)

The cleanest serverless split is:
- **Frontend** → **AWS Amplify Hosting** (auto-deploys from GitHub, serves the Vite build via CDN)
- **Backend** → **AWS Lambda + API Gateway** (wraps the Express server using `serverless-http`)

### Step 1 — Prepare the Lambda wrapper

Install the adapter locally:

```bash
npm install serverless-http
```

Create `server/lambda.cjs`:

```js
'use strict';
const serverless = require('serverless-http');
// Re-use the existing Express app (export app before app.listen)
const app = require('./app.cjs');   // see note below
module.exports.handler = serverless(app);
```

> **Note:** Refactor `server/index.cjs` to export the `app` before calling `app.listen()`, so both the local server and Lambda can use the same Express instance:
>
> ```js
> // At the bottom of server/index.cjs — replace app.listen(...) with:
> if (require.main === module) {
>   app.listen(PORT, () => console.log(`Listening on :${PORT}`));
> }
> module.exports = app;
> ```

### Step 2 — Install the Serverless Framework

```bash
npm install -g serverless
```

Create `serverless.yml` in the project root:

```yaml
service: perfilador-express

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1          # change to your preferred region
  environment:
    DEEPSEEK_API_KEY: ${env:DEEPSEEK_API_KEY}

functions:
  api:
    handler: server/lambda.handler
    events:
      - httpApi:
          path: /api/{proxy+}
          method: ANY

package:
  patterns:
    - '!node_modules/.cache/**'
    - '!src/**'
    - '!dist/**'
    - '!docs/**'
    - '!public/**'
    - '!.env*'
```

### Step 3 — Set the API key as an AWS secret

Never commit the key. Store it in AWS Systems Manager Parameter Store:

```bash
aws ssm put-parameter \
  --name "/perfilador/DEEPSEEK_API_KEY" \
  --value "your-real-deepseek-api-key-here" \
  --type SecureString
```

Then update `serverless.yml` to pull it:

```yaml
environment:
  DEEPSEEK_API_KEY: ${ssm:/perfilador/DEEPSEEK_API_KEY}
```

### Step 4 — Deploy the Lambda

```bash
serverless deploy
```

Copy the **API Gateway URL** it prints (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`).

### Step 5 — Deploy the frontend with AWS Amplify

1. Push the project to GitHub (make sure `.env.local` is in `.gitignore`).
2. Go to **AWS Amplify** → **New app** → **Host web app** → connect your GitHub repo.
3. Amplify auto-detects Vite. Confirm the build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. In **Environment variables**, add:
   ```
   VITE_API_URL = https://abc123.execute-api.us-east-1.amazonaws.com
   ```
5. Click **Save and deploy**.

Amplify builds on every push to `main` automatically.

### Step 6 — Point the frontend at the Lambda URL

Update the API call in your frontend code to use the environment variable:

```js
const apiBase = import.meta.env.VITE_API_URL ?? '';
const response = await fetch(`${apiBase}/api/analyze`, { ... });
```

### Step 7 — CORS update for production

In `server/index.cjs`, allow the Amplify domain instead of localhost:

```js
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
```

Add `FRONTEND_ORIGIN=https://main.abc123.amplifyapp.com` to `serverless.yml` environment (or SSM).

---

### Summary: Part 2 architecture

```
GitHub push → Amplify build → CloudFront CDN  (frontend)
                                   ↓
                         user browser /api/analyze
                                   ↓
                      API Gateway → Lambda (Express)
                                   ↓
                            DeepSeek API
```
