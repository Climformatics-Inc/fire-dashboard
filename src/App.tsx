import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

import AuthGate from "./AuthGate";
import FireDashboard from "./components/Dashboard/Dashboard";

import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    },
  },
});

if (typeof window !== "undefined") {
  const asyncSessionStorage = {
    getItem: async (key: string) => window.sessionStorage.getItem(key),
    setItem: async (key: string, value: string) =>
      window.sessionStorage.setItem(key, value),
    removeItem: async (key: string) => window.sessionStorage.removeItem(key),
  };

  const persister = createAsyncStoragePersister({
    storage: asyncSessionStorage,
    key: "rq-cache",
    throttleTime: 1000,
    serialize: JSON.stringify,
    deserialize: (str) => JSON.parse(str),
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 6 * 60 * 60 * 1000,
  });
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <div className="bg-[#ffffff] min-h-screen w-full text-white">
          <FireDashboard />
        </div>
      </AuthGate>
    </QueryClientProvider>
  );
};

export default App;
