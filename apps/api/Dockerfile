# Use the official Bun base image
FROM oven/bun:1.1.13

# Set working directory
WORKDIR /app

# Install Python and build essentials
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json bun.lockb* ./

# Copy the rest of your code
COPY . .

# Start the application
CMD ["bun", "index.ts"]