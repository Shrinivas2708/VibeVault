import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { libraryApi } from "@/lib/library-api";
import { getErrorMessage } from "@/lib/error-message";
import { showToast } from "@/stores/toast-store";

const HISTORY_KEY = ["library", "history"] as const;

export function useHistory(limit = 50) {
  return useQuery({
    queryKey: [...HISTORY_KEY, limit],
    queryFn: () => libraryApi.listHistory(limit),
    staleTime: 30_000,
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => libraryApi.clearHistory(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      showToast("History cleared");
    },
    onError: (error) => {
      showToast(getErrorMessage(error, "Could not clear history."));
    },
  });
}
