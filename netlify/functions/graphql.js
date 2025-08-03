import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { typeDefs } from '../graphql/schema.js';
import { resolvers } from '../graphql/resolvers.js';
import { DatabaseService } from '../graphql/database.js';
import { createDataLoaders } from '../graphql/dataloaders.js';

// Initialize database connection
const db = new DatabaseService();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [],
});

// Create the Lambda handler
export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event, context }) => {
      return {
        db,
        dataloaders: createDataLoaders(db),
        user: null, // You'll need to extract user from JWT if needed
      };
    },
  }
);
