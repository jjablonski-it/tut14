import {
  ApolloCache,
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { useMemo } from "react";
import { PaginatedPosts } from "../generated/graphql";

type AClient = ApolloClient<NormalizedCacheObject>;

let apolloClient: AClient;

const errorLink = onError(({ graphQLErrors, networkError, response }) => {
  if (graphQLErrors) {
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(
          locations,
          null,
          4
        )}, Path: ${path}`
      )
    );
  }
  if (networkError) console.log(`[Network error]: ${networkError}`);
  if (response) console.log("[response]", response);
});

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: ApolloLink.from([
      errorLink,
      new HttpLink({
        uri: process.env.NEXT_PUBLIC_API_URL, // Server URL (must be absolute)
        credentials: "include", // Additional fetch() options like `credentials` or `headers`
      }),
    ]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            posts: {
              merge: (existing, incoming): PaginatedPosts | {} => {
                if (!existing) return incoming;

                if (existing.posts[0].__ref === incoming.posts[0].__ref)
                  return incoming;

                const existingPosts = existing?.posts || [];
                const combinedPosts = [...existingPosts, ...incoming.posts];

                return { ...incoming, posts: combinedPosts };
              },
              read: (p) => p,
            },
          },
        },
      },
    }),
  });
}

export function initializeApollo(
  initialState: ApolloCache<InMemoryCache> | null = null
): AClient {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();
    // Restore the cache using the data passed from getStaticProps/getServerSideProps
    // combined with the existing cached data
    _apolloClient.cache.restore({ ...existingCache, ...initialState });
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useApollo(initialState: ApolloCache<InMemoryCache>): AClient {
  const store = useMemo(() => initializeApollo(initialState), [initialState]);
  return store;
}
