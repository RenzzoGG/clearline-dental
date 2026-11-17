import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";

/** Public catalog (active services/dentists only for non-staff). Shared with booking. */
export const useServices = () =>
  useQuery({
    queryKey: ["services"],
    queryFn: api.services,
    select: (page) => page.results,
    staleTime: 5 * 60_000,
  });

export const useDentists = () =>
  useQuery({
    queryKey: ["dentists"],
    queryFn: api.dentists,
    select: (page) => page.results,
    staleTime: 5 * 60_000,
  });
