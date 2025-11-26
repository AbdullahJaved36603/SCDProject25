NodeVault – Secure Record Management System

Backend + MongoDB Dockerized Deployment

1. Project Overview

NodeVault is a secure record-management CLI application built with Node.js and MongoDB.
This project demonstrates:

Fixing environment inconsistencies

Containerizing backend + database

Creating Docker networks and volumes

Deploying manually and with Docker Compose

Automating builds using Dockerfiles

Final deployment using docker-compose up

GitHub Repository:
https://github.com/AbdullahJaved36603/SCDProject25

Docker Hub Image (Backend):
https://hub.docker.com/r/abdullah36603/nodevault-backend

2. Features Implemented

Search Records

Sorting (A–Z / Z–A)

Export Vault Data to text file

Automatic Backup System

Data Statistics

MongoDB integration with .env values

All features tested inside Docker containers

3. Dockerization Summary
Backend Dockerfile

Located in /backend.
Builds a production-ready Node.js environment with:

Clean npm install

Environment variable support

Production execution

Backend Image Build
docker build -t nodevault-backend .

Published to Docker Hub
docker tag nodevault-backend abdullah36603/nodevault-backend:latest
docker push abdullah36603/nodevault-backend:latest

4. Manual Deployment (Part 5)
4.1 Create Private Docker Network
docker network create vault-net

4.2 Create MongoDB Container with Volume
docker run -d \
  --name vault-mongo \
  --network vault-net \
  -v vault-mongo-data:/data/db \
  -p 27018:27017 \
  mongo:6

4.3 Run Backend with Environment Variables
docker run -d \
  --name nodevault \
  --network vault-net \
  --env-file .env \
  abdullah36603/nodevault-backend:latest

4.4 Persistence Test
docker stop vault-mongo
docker rm vault-mongo
docker run -d ... (same command)


Data remained intact due to volume.

4.5 Manual Deployment Difficulties

Managing network names

Exposing correct ports

Remembering long Docker commands

Manual environment variable configuration

Re-running containers after deleting them

Ensuring MongoDB starts before backend

5. Docker Compose Deployment (Part 6)

A complete production-ready docker-compose.yml was created:

docker-compose.yml
services:
  backend:
    build: ./backend
    container_name: nodevault
    env_file: .env
    depends_on:
      - mongo
    networks:
      - vault-net

  mongo:
    image: mongo:6
    container_name: vault-mongo
    ports:
      - "27018:27017"
    volumes:
      - vault-mongo-data:/data/db
    networks:
      - vault-net

volumes:
  vault-mongo-data:

networks:
  vault-net:
    driver: bridge

Run All Services
docker compose up --build

Result

Backend auto-builds from Dockerfile

MongoDB starts automatically

Both containers join the private network

No manual commands required

6. Final Repository Setup (Part 7)
Steps Performed

Added docker-compose.yml to project root

Added .env file for sensitive configuration

Cleaned all local images

docker system prune -a


Verified that Docker Compose successfully rebuilds backend image

Application tested and running

Final project pushed to GitHub

7. How to Run the Project
Step 1: Clone the repository
git clone https://github.com/AbdullahJaved36603/SCDProject25
cd SCDProject25

Step 2: Add your .env

Example:

MONGO_URI=mongodb://vault-mongo:27017/vaultdb

Step 3: Run using Docker Compose
docker compose up --build

8. Project Structure
SCDProject25/
│
├── backend/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── utils/
│
├── docker-compose.yml
├── .env
└── README.md

9. Conclusion

This project completes all requirements of the assignment, including:

Full Docker containerization

Private network and persistent storage

Manual Docker deployment

Automated deployment using Compose

Final GitHub + Docker Hub publishing
