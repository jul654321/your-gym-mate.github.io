import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import type { SettingEntryDTO, UpdateSettingCmd } from "../types";

const QUERY_KEY = "settings";

export function useGetSetting<T = unknown>(
  key: string,
  options?: Omit<UseQueryOptions<T | null>, "queryKey" | "queryFn">
) {
  const { enabled, ...restOptions } = options ?? {};
  return useQuery<T | null>({
    queryKey: [QUERY_KEY, key],
    queryFn: async () => {
      const db = await getDB();
      const entry = (await db.get(STORE_NAMES.settings, key)) as
        | SettingEntryDTO
        | undefined;
      return entry?.value as T | null;
    },
    enabled: enabled ?? Boolean(key),
    ...restOptions,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: UpdateSettingCmd) => {
      const db = await getDB();
      const entry: SettingEntryDTO = {
        key: cmd.key,
        value: cmd.value,
        updatedAt: cmd.updatedAt ?? Date.now(),
      };
      await db.put(STORE_NAMES.settings, entry);
      return entry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, entry.key] });
    },
  });
}
