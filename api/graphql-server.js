import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { DatabaseService } from './graphql/database.js';
import { createDataLoaders } from './graphql/dataloaders.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Initialize database connection
const db = new DatabaseService();

// GraphQL server configuration
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  formatError: (err) => {
    console.error('GraphQL Error:', err);
    return {
      message: err.message,
      code: err.extensions?.code || 'INTERNAL_ERROR',
      path: err.path
    };
  }
});

// Context function for GraphQL
const createContext = async ({ req }) => {
  let user = null;
  
  // Extract token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      user = decoded;
    } catch (error) {
      console.warn('Invalid token:', error.message);
    }
  }
  
  return {
    user,
    db,
    dataloaders: createDataLoaders(db)
  };
};

// Start server
async function startServer() {
  await server.start();
  
  // Apply middleware
  app.use(
    '/graphql',
    cors({
      origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5500'],
      credentials: true
    }),
    express.json(),
    expressMiddleware(server, {
      context: createContext
    })
  );
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'GraphQL API', timestamp: new Date().toISOString() });
  });
  
  const PORT = process.env.GRAPHQL_PORT || 4000;
  
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  
  console.log(`🚀 GraphQL Server ready at http://localhost:${PORT}/graphql`);
  console.log(`📊 GraphQL Playground available at http://localhost:${PORT}/graphql`);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
