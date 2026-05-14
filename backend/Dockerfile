FROM rust:slim AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY sql ./sql

# Compila deps com main vazio para cachear a camada
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs && \
    cargo build --release && \
    rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/backend .
EXPOSE 3001
CMD ["./backend"]
