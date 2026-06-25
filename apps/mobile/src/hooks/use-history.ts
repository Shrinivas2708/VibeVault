import { useQuery } from "@tanstack/react-query";
import { libraryApi } from "@/lib/library-api";

export function useHistory(limit = 50) {
  return useQuery({
    queryKey: ["library", "history", limit],
    queryFn: () => libraryApi.listHistory(limit),
    staleTime: 30_000,
  });
}
