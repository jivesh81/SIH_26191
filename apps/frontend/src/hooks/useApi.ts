"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Habitation,
  Site,
  Route,
  RouteFeasibility,
  OptimizationResponse,
  OptimizationAssignment,
  SiteCapacitySummary,
  InfeasibilityReason,
  ActivePlanResponse,
  PlanVersion,
  EventTriggerResponse,
  DisasterEvent,
  EventLogResponse,
  PredictedRiskRequest,
  PredictedRiskResponse,
  PredictedRiskListResponse,
  SMSLogEntry,
  SMSLogResponse,
  PlanApprovalRequest,
  PlanApprovalResponse,
  RouteFeasibilityResponse,
  RouteFeasibilityListResponse,
  RiskAssessmentResponse,
  RiskAssessmentListResponse,
  HealthResponse,
  ReadinessResponse,
  runOptimization,
  triggerEvent,
  getActivePlan,
  getEventLog,
  getHabitations,
  getSites,
  getRoutes,
  getAllRouteFeasibility,
  checkRouteFeasibility,
  predictRisk,
  predictRiskBatch,
  checkAllRoutesFromHabitation,
  approvePlanAndNotify,
  getSMSLog,
  getRiskAssessments,
  getRiskAssessment,
  getRedZoneHabitations,
  getHealth,
  getReadiness,
  getApiHealth,
} from "@/lib/api";

export function useHabitations(accessibleOnly = true) {
  return useQuery({
    queryKey: ["habitations", accessibleOnly],
    queryFn: () => getHabitations({ accessible_only: accessibleOnly }),
    staleTime: 30000,
  });
}

export function useSites(availableOnly = true) {
  return useQuery({
    queryKey: ["sites", availableOnly],
    queryFn: () => getSites({ available_only: availableOnly }),
    staleTime: 30000,
  });
}

export function useRoutes(openOnly = true) {
  return useQuery({
    queryKey: ["routes", openOnly],
    queryFn: () => getRoutes({ open_only: openOnly }),
    staleTime: 30000,
  });
}

export function useRouteFeasibility() {
  return useQuery({
    queryKey: ["route-feasibility"],
    queryFn: getAllRouteFeasibility,
    staleTime: 30000,
  });
}

export function useRouteFeasibilityCheck(habitationId: string, siteId: string) {
  return useQuery({
    queryKey: ["route-feasibility", habitationId, siteId],
    queryFn: () => checkRouteFeasibility(habitationId, siteId),
    enabled: !!habitationId && !!siteId,
    staleTime: 30000,
  });
}

export function useAllRoutesFromHabitation(habitationId: string) {
  return useQuery({
    queryKey: ["routes-from-habitation", habitationId],
    queryFn: () => checkAllRoutesFromHabitation(habitationId),
    enabled: !!habitationId,
    staleTime: 30000,
  });
}

export function useOptimization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runOptimization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-plan"] });
      queryClient.invalidateQueries({ queryKey: ["event-log"] });
      queryClient.invalidateQueries({ queryKey: ["habitations"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useActivePlan() {
  return useQuery({
    queryKey: ["active-plan"],
    queryFn: getActivePlan,
    refetchInterval: 5000,
  });
}

export function useEventLog() {
  return useQuery({
    queryKey: ["event-log"],
    queryFn: getEventLog,
    refetchInterval: 5000,
  });
}

export function useTriggerEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-plan"] });
      queryClient.invalidateQueries({ queryKey: ["event-log"] });
      queryClient.invalidateQueries({ queryKey: ["habitations"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["route-feasibility"] });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getHabitationItems(data: any): any[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.habitations)) {
    return data.habitations;
  }

  if (Array.isArray(data.features)) {
    return data.features;
  }

  return [];
}

function getSiteItems(data: any): any[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.sites)) {
    return data.sites;
  }

  if (Array.isArray(data.features)) {
    return data.features;
  }

  return [];
}

function getPopulation(item: any): number {
  return Number(
    item?.population ??
      item?.properties?.population ??
      item?.properties?.affected_population ??
      0,
  );
}

function getEffectiveCapacity(item: any): number {
  const explicit =
    item?.available_capacity ??
    item?.effective_capacity ??
    item?.properties?.available_capacity ??
    item?.properties?.effective_capacity ??
    item?.properties?.capacity;

  if (explicit != null) {
    return Number(explicit);
  }

  const maxCap = Number(
    item?.max_capacity ?? item?.properties?.max_capacity ?? 0,
  );
  const currentAlloc = Number(
    item?.current_allocation ?? item?.properties?.current_allocation ?? 0,
  );
  return maxCap - currentAlloc;
}

function getActivePlanData(activePlan: any): any {
  if (!activePlan) return null;
  return activePlan.plan ?? activePlan;
}

/* -------------------------------------------------------------------------- */
/* KPI                                                                        */
/* -------------------------------------------------------------------------- */

export function useKPIs() {
  const {
    data: habitations,
    isLoading: habitationsLoading,
    error: habitationsError,
  } = useHabitations(false);

  const {
    data: sites,
    isLoading: sitesLoading,
    error: sitesError,
  } = useSites(false);

  const { data: activePlan } = useActivePlan();

  const habitationItems = getHabitationItems(habitations);
  const siteItems = getSiteItems(sites);
  const activePlanData = getActivePlanData(activePlan);

  const vulnerablePopulation = habitationItems.reduce(
    (sum, habitation) => sum + getPopulation(habitation),
    0,
  );

  const totalEffectiveCapacity = siteItems.reduce(
    (sum, site) => sum + getEffectiveCapacity(site),
    0,
  );

  const assignedPopulation = Number(
    activePlanData?.total_assigned_population ??
      activePlanData?.assigned_population ??
      activePlanData?.summary?.total_assigned_population ??
      0,
  );

  const unmetPopulation = Number(
    activePlanData?.total_unmet_population ??
      activePlanData?.unmet_population ??
      activePlanData?.summary?.total_unmet_population ??
      0,
  );

  const activePlanVersion =
    activePlanData?.version ??
    activePlanData?.plan_version ??
    activePlanData?.id ??
    0;

  const activePlanStatus =
    activePlanData?.status ?? activePlanData?.plan_status ?? "none";

  return {
    vulnerablePopulation,
    totalEffectiveCapacity,
    assignedPopulation,
    unmetPopulation,
    activePlanVersion,
    activePlanStatus,
    isLoading: habitationsLoading || sitesLoading,
    error: habitationsError || sitesError || null,
  };
}

/* -------------------------------------------------------------------------- */
/* Assignments                                                                */
/* -------------------------------------------------------------------------- */

export function useAssignments() {
  const { data: activePlan, isLoading, error } = useActivePlan();

  const activePlanData = getActivePlanData(activePlan);

  const assignments =
    activePlanData?.assignments ??
    activePlanData?.result?.assignments ??
    activePlanData?.optimization?.assignments ??
    [];

  return {
    data: Array.isArray(assignments) ? assignments : [],
    isLoading,
    error: error ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Site capacities                                                             */
/* -------------------------------------------------------------------------- */

export function useSiteCapacities() {
  const { data: activePlan } = useActivePlan();
  const { data: sites, isLoading, error } = useSites(false);

  const siteItems = getSiteItems(sites);
  const activePlanData = getActivePlanData(activePlan);

  const planSiteCapacities =
    activePlanData?.site_capacities ??
    activePlanData?.capacities ??
    activePlanData?.result?.site_capacities ??
    [];

  if (Array.isArray(planSiteCapacities) && planSiteCapacities.length > 0) {
    return {
      data: planSiteCapacities,
      isLoading,
      error: error ?? null,
    };
  }

  const fallback: SiteCapacitySummary[] = siteItems.map((site: any) => {
    const properties = site?.properties ?? {};

    const siteId =
      site?.id ?? site?.site_id ?? properties?.id ?? properties?.site_id ?? "";

    const siteName =
      site?.name ??
      site?.site_name ??
      properties?.name ??
      properties?.site_name ??
      siteId;

    const maxCapacity = Number(
      site?.max_capacity ??
        properties?.max_capacity ??
        properties?.capacity ??
        0,
    );

    const availableCapacity = getEffectiveCapacity(site);

    return {
      site_id: siteId,
      site_name: siteName,
      max_capacity: maxCapacity,
      current_allocation: Number(
        site?.current_allocation ?? properties?.current_allocation ?? 0,
      ),
      allocated_population: Number(
        site?.allocated_population ?? properties?.allocated_population ?? 0,
      ),
      remaining_capacity: availableCapacity,
      assigned_habitations: [],
    };
  });

  return {
    data: fallback,
    isLoading,
    error: error ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Infeasibility                                                              */
/* -------------------------------------------------------------------------- */

export function useInfeasibilityReasons(): InfeasibilityReason[] {
  const { data: activePlan } = useActivePlan();

  const activePlanData = getActivePlanData(activePlan);

  const reasons =
    activePlanData?.infeasibility_reasons ??
    activePlanData?.reasons ??
    activePlanData?.result?.infeasibility_reasons ??
    [];

  return Array.isArray(reasons) ? reasons : [];
}

/* -------------------------------------------------------------------------- */
/* Plan versions                                                              */
/* -------------------------------------------------------------------------- */

export function usePlanVersions(): PlanVersion[] {
  const { data: activePlan } = useActivePlan();

  if (!activePlan) return [];

  const versions =
    (activePlan as any)?.all_versions ??
    (activePlan as any)?.versions ??
    (activePlan as any)?.plan_versions ??
    [];

  return Array.isArray(versions) ? versions : [];
}

/* -------------------------------------------------------------------------- */
/* Event mutation alias                                                       */
/* -------------------------------------------------------------------------- */

export function useTriggerEventMutation() {
  return useTriggerEvent();
}

/* -------------------------------------------------------------------------- */
/* ML Risk Prediction                                                         */
/* -------------------------------------------------------------------------- */

export function usePredictRisk(request: PredictedRiskRequest) {
  return useQuery({
    queryKey: ["predict-risk", request.habitation_id, request.weather],
    queryFn: () => predictRisk(request),
    enabled: !!request.habitation_id,
  });
}

export function usePredictRiskBatch(weather?: Record<string, number>) {
  return useQuery({
    queryKey: ["predict-risk-batch", weather],
    queryFn: () => predictRiskBatch(weather),
  });
}

/* -------------------------------------------------------------------------- */
/* Risk Assessment (Deterministic)                                           */
/* -------------------------------------------------------------------------- */

export function useRiskAssessments() {
  return useQuery({
    queryKey: ["risk-assessments"],
    queryFn: getRiskAssessments,
    staleTime: 30000,
  });
}

export function useRiskAssessment(habitationId: string) {
  return useQuery({
    queryKey: ["risk-assessment", habitationId],
    queryFn: () => getRiskAssessment(habitationId),
    enabled: !!habitationId,
    staleTime: 30000,
  });
}

export function useRedZoneHabitations() {
  return useQuery({
    queryKey: ["red-zone-habitations"],
    queryFn: getRedZoneHabitations,
    staleTime: 30000,
  });
}

/* -------------------------------------------------------------------------- */
/* SMS Log                                                                    */
/* -------------------------------------------------------------------------- */

export function useSMSLog(planId?: string, limit: number = 100) {
  return useQuery({
    queryKey: ["sms-log", planId, limit],
    queryFn: () => getSMSLog(planId, limit),
    refetchInterval: 5000,
  });
}

/* -------------------------------------------------------------------------- */
/* Plan Approval                                                              */
/* -------------------------------------------------------------------------- */

export function useApprovePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PlanApprovalRequest) => approvePlanAndNotify(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-plan"] });
      queryClient.invalidateQueries({ queryKey: ["sms-log"] });
      queryClient.invalidateQueries({ queryKey: ["event-log"] });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Health / Readiness                                                         */
/* -------------------------------------------------------------------------- */

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: ["readiness"],
    queryFn: getReadiness,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useApiHealth() {
  return useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/* -------------------------------------------------------------------------- */
/* Type exports                                                               */
/* -------------------------------------------------------------------------- */

export type {
  Habitation,
  Site,
  Route,
  RouteFeasibility,
  RouteFeasibilityResponse,
  RouteFeasibilityListResponse,
  OptimizationResponse,
  OptimizationAssignment,
  SiteCapacitySummary,
  InfeasibilityReason,
  ActivePlanResponse,
  PlanVersion,
  EventTriggerResponse,
  DisasterEvent,
  EventLogResponse,
  PredictedRiskRequest,
  PredictedRiskResponse,
  PredictedRiskListResponse,
  SMSLogEntry,
  SMSLogResponse,
  PlanApprovalRequest,
  PlanApprovalResponse,
  RiskAssessmentResponse,
  RiskAssessmentListResponse,
  HealthResponse,
  ReadinessResponse,
};
