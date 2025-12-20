# Step 1: Use Node.js for building
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Expose the port
EXPOSE 5173

# Start the app
CMD ["npm", "run", "dev", "--", "--host"]