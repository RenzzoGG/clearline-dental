import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import type { Appointment, StatusAction } from "../../lib/types";
import { ACTION_RESULT } from "./status";

export const appointmentKeys = {
  all: ["appointments"] as const,
  range: (from: string, to: string) => ["appointments", from, to] as const,
};

export const useAppointments = (from: string, to: string) =>
  useQuery({
    queryKey: appointmentKeys.range(from, to),
    queryFn: () => api.allAppointments({ date_from: from, date_to: to }),
    placeholderData: (previous) => previous, // keep the grid while navigating weeks
  });

/**
 * Status change with an optimistic update: every cached list shows the new status at once
 * and is rolled back if the API rejects the transition (e.g. 409).
 */
export function useTransitionAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: StatusAction }) =>
      api.transition(id, action),
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: appointmentKeys.all });
      const snapshot = queryClient.getQueriesData<Appointment[]>({ queryKey: appointmentKeys.all });
      queryClient.setQueriesData<Appointment[]>({ queryKey: appointmentKeys.all }, (list) =>
        list?.map((item) => (item.id === id ? { ...item, status: ACTION_RESULT[action] } : item)),
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export const useStats = (from: string, to: string) =>
  useQuery({
    queryKey: ["stats", from, to],
    queryFn: () => api.stats(from, to),
    placeholderData: (previous) => previous,
  });
