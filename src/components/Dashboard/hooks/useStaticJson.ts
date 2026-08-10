import { useQuery, QueryClient } from "@tanstack/react-query";

type Options = { enabled?: boolean };

export function useStaticJson<T = any>(url: string | undefined, opts?: Options) {
  const enabled = !!url && (opts?.enabled ?? true);

  return useQuery({
    queryKey: ["static-json", url],
    queryFn: async ({ signal }) => {
      const res = await fetch(url!, {
        signal,
        cache: "force-cache",
      });
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
      return (await res.json()) as T;
    },

    enabled,
    staleTime: Infinity,
    gcTime: 6 * 60 * 60 * 1000,

    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,

    placeholderData: (prev) => prev,
  });
}

export function prefetchStaticJson<T = any>(qc: QueryClient, url: string) {
  return qc.prefetchQuery({
    queryKey: ["static-json", url],
    queryFn: async ({ signal }) => {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
      return (await res.json()) as T;
    },
    staleTime: Infinity,
  });
}
