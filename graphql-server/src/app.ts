require('dotenv').config();
import express, {Request, Response} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {notFound, errorHandler} from './middlewares';
import {MessageResponse} from './hybrid-types/MessageTypes';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import typeDefs from './api/schemas/index';
import resolvers from './api/resolvers/index';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import {MyContext} from './local-types';
import {authenticate} from './lib/functions';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {
  constraintDirectiveTypeDefs,
  createApollo4QueryValidationPlugin,
} from 'graphql-constraint-directive/apollo4';

const app = express();

(async () => {
  try {
    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
      }),
    );

    // Enable CORS middleware
    app.use(
      cors({
        origin:
          'https://users.metropolia.fi/~veetiso/vuosi3/hybrid/hybrid-yksilotehtava',
      }),
    );

    app.get('/', (_req: Request, res: Response<MessageResponse>) => {
      res.send({message: 'Server is running'});
    });

    const schema = makeExecutableSchema({
      typeDefs: [constraintDirectiveTypeDefs, typeDefs],
      resolvers,
    });

    const server = new ApolloServer<MyContext>({
      schema,
      plugins: [
        createApollo4QueryValidationPlugin({schema}),
        process.env.NODE_ENV === 'production'
          ? ApolloServerPluginLandingPageProductionDefault()
          : ApolloServerPluginLandingPageLocalDefault(),
      ],
    });

    await server.start();

    app.use(
      '/graphql',
      express.json(),
      expressMiddleware(server, {
        context: ({req}) => authenticate(req),
      }),
    );

    app.use(notFound);
    app.use(errorHandler);
  } catch (error) {
    console.error((error as Error).message);
  }
})();

export default app;
