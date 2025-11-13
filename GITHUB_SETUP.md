# GitHub Setup Guide

This guide will help you push the M17 Merchant Management API to GitHub and set up Docker image publishing.

## 📋 Prerequisites

- Git installed on your system
- GitHub account
- GitHub CLI (optional, but recommended)

## 🚀 Step-by-Step Setup

### Step 1: Initialize Git Repository

```bash
cd C:\Users\17272\CascadeProjects\M17-merchant-management

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: M17 Merchant Management API v1.0.0"
```

### Step 2: Create GitHub Repository

#### Option A: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `M17-merchant-management`
3. Description: `Merchant Management API for Food Delivery Tracking System`
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

#### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# Download from: https://cli.github.com/

# Login to GitHub
gh auth login

# Create repository
gh repo create M17-merchant-management --public --description "Merchant Management API for Food Delivery Tracking System" --source=. --remote=origin
```

### Step 3: Connect Local Repository to GitHub

```bash
# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/M17-merchant-management.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 4: Set Up GitHub Actions for Docker

The repository already includes `.github/workflows/docker-publish.yml` which will automatically:
- Build Docker images on every push to main
- Publish images to GitHub Container Registry (ghcr.io)
- Tag images with version numbers

#### Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Actions** → **General**
4. Under "Actions permissions", select **Allow all actions and reusable workflows**
5. Click **Save**

#### Enable GitHub Container Registry

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Packages** in the left sidebar
4. The container registry is automatically enabled

### Step 5: Create a Release (Optional)

To trigger version-tagged Docker images:

```bash
# Create and push a tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This will create Docker images tagged as:
- `ghcr.io/YOUR_USERNAME/m17-merchant-management:v1.0.0`
- `ghcr.io/YOUR_USERNAME/m17-merchant-management:1.0`
- `ghcr.io/YOUR_USERNAME/m17-merchant-management:1`
- `ghcr.io/YOUR_USERNAME/m17-merchant-management:latest`

## 🐳 Pulling Docker Images

### For Your Integration Team

Once pushed to GitHub, your team can pull the Docker image:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest

# Run the container
docker run -d \
  --name m17-merchant-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
```

### Making Images Public

To make your Docker images publicly accessible:

1. Go to https://github.com/YOUR_USERNAME?tab=packages
2. Click on your package `m17-merchant-management`
3. Click **Package settings**
4. Scroll down to **Danger Zone**
5. Click **Change visibility**
6. Select **Public**
7. Confirm the change

Now anyone can pull without authentication:
```bash
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
```

## 📝 Repository Setup Checklist

- [ ] Git repository initialized
- [ ] All files committed
- [ ] GitHub repository created
- [ ] Remote origin added
- [ ] Code pushed to GitHub
- [ ] GitHub Actions enabled
- [ ] Docker images building successfully
- [ ] Package visibility set (public/private)
- [ ] README.md updated with correct URLs
- [ ] Team members have access

## 🔒 Security Best Practices

### Protect Sensitive Data

Make sure `.gitignore` excludes:
- `.env` files with secrets
- `logs/` directory
- `node_modules/`
- Any API keys or credentials

### Branch Protection

Set up branch protection for `main`:

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 📤 Sharing with Integration Team

### Share Repository Access

1. Go to **Settings** → **Collaborators**
2. Click **Add people**
3. Enter team members' GitHub usernames
4. Select appropriate permission level:
   - **Read**: View code only
   - **Write**: Push changes
   - **Admin**: Full access

### Share Docker Image

Send your team the following information:

```markdown
## M17 Merchant Management API - Docker Deployment

**Docker Image**: `ghcr.io/YOUR_USERNAME/m17-merchant-management:latest`

**Quick Start**:
```bash
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
docker run -d -p 3000:3000 --name m17-api ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
```

**Documentation**:
- Repository: https://github.com/YOUR_USERNAME/M17-merchant-management
- API Docs: See README.md
- Deployment Guide: See DEPLOYMENT.md

**API Endpoints**: `http://localhost:3000/api/merchant`
```

## 🔄 Updating the Repository

### Making Changes

```bash
# Make your changes
# ...

# Stage changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

### Creating New Releases

```bash
# Create a new version tag
git tag -a v1.1.0 -m "Release version 1.1.0 - Added new features"

# Push tag to GitHub
git push origin v1.1.0

# GitHub Actions will automatically build and publish the new version
```

## 📊 Monitoring Builds

### Check GitHub Actions

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. View build status and logs
4. Check for any errors

### View Published Packages

1. Go to your GitHub profile
2. Click on **Packages** tab
3. Click on `m17-merchant-management`
4. View all published versions

## 🆘 Troubleshooting

### Push Rejected

```bash
# If push is rejected, pull first
git pull origin main --rebase
git push origin main
```

### GitHub Actions Failing

1. Check the Actions tab for error logs
2. Common issues:
   - Docker build errors: Check Dockerfile
   - Permission errors: Check repository settings
   - Syntax errors: Validate YAML files

### Authentication Issues

```bash
# Use personal access token instead of password
# Generate at: https://github.com/settings/tokens

# Configure git to use token
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/M17-merchant-management.git
```

## ✅ Verification

After setup, verify everything works:

```bash
# 1. Check repository is accessible
curl https://api.github.com/repos/YOUR_USERNAME/M17-merchant-management

# 2. Check Docker image is available
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest

# 3. Run the container
docker run -d -p 3000:3000 ghcr.io/YOUR_USERNAME/m17-merchant-management:latest

# 4. Test API
curl http://localhost:3000/api
```

## 📞 Next Steps

1. ✅ Push code to GitHub
2. ✅ Verify Docker images are building
3. ✅ Share repository with team
4. ✅ Update README.md with your repository URL
5. ✅ Create first release (v1.0.0)
6. ✅ Send deployment instructions to integration team

---

**You're all set!** 🎉

Your M17 Merchant Management API is now on GitHub and ready for your integration team to use.
