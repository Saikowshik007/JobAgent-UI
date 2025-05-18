# Updated Dockerfile for JobTrak React UI that works without package-lock.json

# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json first
COPY package.json ./

# Use regular npm install instead of npm ci
# This will generate a package-lock.json if it doesn't exist
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables for production build
ARG REACT_APP_API_BASE_URL=http://localhost:8000
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]