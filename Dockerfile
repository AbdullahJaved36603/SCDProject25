# Dockerfile
# Use Node 18 LTS (or latest stable version compatible)
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Default command to run the app
CMD ["node", "main.js"]
