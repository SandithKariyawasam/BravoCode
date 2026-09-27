# Use Ubuntu 22.04 as the base image for maximum compiler compatibility
FROM ubuntu:22.04

# Avoid tzdata interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# 1. Update and install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    zip \
    build-essential \
    software-properties-common \
    gnupg2 \
    tzdata \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

# 2. Install general Compilers and Interpreters (Java, Python, Go, Ruby, PHP, R, Scala)
RUN apt-get update && apt-get install -y \
    default-jdk \
    python3 \
    python3-pip \
    golang-go \
    ruby-full \
    php-cli \
    r-base \
    scala \
    && rm -rf /var/lib/apt/lists/*

# 3. Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# 4. Install Node.js (v20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g typescript ts-node

# 5. Install Kotlin (kotlinc)
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.9.23/kotlin-compiler-1.9.23.zip \
    && unzip kotlin-compiler-1.9.23.zip -d /opt/ \
    && rm kotlin-compiler-1.9.23.zip
ENV PATH="/opt/kotlinc/bin:${PATH}"

# 6. Install Dart
RUN wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/dart.gpg \
    && echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' | tee /etc/apt/sources.list.d/dart_stable.list \
    && apt-get update && apt-get install -y dart \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/lib/dart/bin:${PATH}"

# 7. Install C# (.NET SDK for csc)
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update && apt-get install -y dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# 8. Install Swift
RUN apt-get update && apt-get install -y \
    binutils \
    libc6-dev \
    libcurl4-openssl-dev \
    libedit2 \
    libgcc-9-dev \
    libpython3.10 \
    libsqlite3-0 \
    libstdc++-9-dev \
    libxml2-dev \
    libz3-dev \
    pkg-config \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://download.swift.org/swift-5.10-release/ubuntu2204/swift-5.10-RELEASE/swift-5.10-RELEASE-ubuntu22.04.tar.gz \
    && tar xzf swift-5.10-RELEASE-ubuntu22.04.tar.gz \
    && mv swift-5.10-RELEASE-ubuntu22.04 /usr/share/swift \
    && rm swift-5.10-RELEASE-ubuntu22.04.tar.gz
ENV PATH="/usr/share/swift/usr/bin:${PATH}"


# Set up the backend application
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Ensure temp directory exists and has correct permissions
RUN mkdir -p temp && chmod 777 temp

# Expose the backend port
EXPOSE 5000

# Start the Node.js server
CMD ["node", "server.js"]
