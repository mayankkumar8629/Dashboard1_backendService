# Dashboard1_backendService
# Influencer Management & Analytics Platform — Backend Service

## Overview

The **Influencer Management & Analytics Platform** is a full-fledged system designed to connect **creators (influencers)** and **brands**. It provides tools for:

- **AI-powered analytics & forecasting** — track influencer performance and predict engagement.
- **Collaboration & deal management** — manage brand partnerships and influencer campaigns.
- **Financial and workflow tracking** — monitor budgets, payouts, and campaign progress.
- **Smart recommendations & automation** — suggest influencers for campaigns and automate repetitive tasks.

The platform is composed of multiple services, including frontend applications, backend APIs, and a cloud-hosted database. This repository focuses on the **backend service**, which is the core of the platform’s business logic.

---

## Backend Service Overview

The **Backend Service** is responsible for:

1. **User Authentication**
   - Supports account registration and login.
   - JWT / OAuth2 authentication for secure access.
   - Passwords are securely hashed before storing in the database.

2. **Database Management**
   - Uses **Prisma ORM** to define models and relationships.
   - Connected to **Supabase PostgreSQL** for cloud-hosted, scalable storage.
   - Handles all CRUD operations for:
     - Users
     - Influencer Details
     - Brand Details
     - Connected Social Accounts (future)

3. **API Layer**
   - Built with **Node.js** and **Express.js**.
   - Provides REST API endpoints for frontend consumption.
   - Handles request validation, response formatting, and error handling.

4. **Data Relations**
   - **User → InfluencerDetails?** (optional)
   - **User → BrandDetails?** (optional)
   - **InfluencerDetails → ConnectedAccounts[]** (supports multiple social accounts)
   - Ensures referential integrity and clean relational mapping.

5. **Environment & Configuration**
   - Uses `.env` file for sensitive configuration:
     - `DATABASE_URL` → connection to Supabase
     - `PORT` → server port
   - Prisma Client is generated to interact with the database.

---

## Tech Stack

- **Backend Framework:** Node.js + Express.js  
- **Database:** Supabase PostgreSQL (cloud-hosted)  
- **ORM:** Prisma  
- **Authentication:** JWT / OAuth2  
- **Caching (future):** Redis  
- **Containerization (optional):** Docker  
- **Environment Management:** dotenv  

---



