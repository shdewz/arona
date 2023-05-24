# Use Ubuntu as base
# FROM ubuntu:22.04 as builder
FROM node:18.16

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

RUN apt-get update --fix-missing
RUN apt-get install -y curl
RUN apt-get install -y build-essential libssl-dev
RUN apt-get upgrade -y

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
	export PATH="$HOME/.cargo/bin:$PATH"
	
RUN source "$HOME/.cargo/env"

# Set working directory
WORKDIR /app

# Copy repo files
COPY . .

# Install everything in package.json / package-lock.json
RUN npm install

# Change typescript version
RUN npm install typescript@4.5.5 -g

# Build typescript
RUN tsc

# Start application
CMD ["node", "index.js"]
