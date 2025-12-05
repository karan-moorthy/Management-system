import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { CustomFieldType } from "../types-custom-fields";

// Get custom field definitions for workspace
export const useGetCustomFieldDefinitions = (workspaceId: string) => {
  return useQuery({
    queryKey: ["custom-field-definitions", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].definitions.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch custom field definitions");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!workspaceId,
  });
};

// Get custom field values for a task
export const useGetCustomFieldValues = (taskId: string) => {
  return useQuery({
    queryKey: ["custom-field-values", taskId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].values[":taskId"].$get({
        param: { taskId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch custom field values");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!taskId,
  });
};

// Create custom field definition
export const useCreateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      fieldName: string;
      fieldKey: string;
      fieldType: CustomFieldType;
      fieldDescription?: string;
      isRequired?: boolean;
      defaultValue?: string;
      fieldOptions?: any;
      validationRules?: any;
      appliesToIssueTypes?: string[];
      appliesToProjects?: string[];
      isVisibleInList?: boolean;
      isVisibleInDetail?: boolean;
      isSearchable?: boolean;
      isFilterable?: boolean;
      displayOrder?: number;
    }) => {
      const response = await client.api.tasks["custom-fields"].definitions.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to create custom field");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions", variables.workspaceId],
      });
    },
  });
};

// Update custom field definition
export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      ...payload
    }: {
      id: string;
      workspaceId: string;
      fieldName?: string;
      fieldDescription?: string;
      isRequired?: boolean;
      defaultValue?: string;
      fieldOptions?: any;
      validationRules?: any;
      appliesToIssueTypes?: string[];
      appliesToProjects?: string[];
      isVisibleInList?: boolean;
      isVisibleInDetail?: boolean;
      isSearchable?: boolean;
      isFilterable?: boolean;
      displayOrder?: number;
    }) => {
      const response = await client.api.tasks["custom-fields"].definitions[":id"].$patch({
        param: { id },
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to update custom field");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions", variables.workspaceId],
      });
    },
  });
};

// Delete custom field definition
export const useDeleteCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const response = await client.api.tasks["custom-fields"].definitions[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete custom field");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions", variables.workspaceId],
      });
    },
  });
};

// Set custom field value
export const useSetCustomFieldValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      taskId: string;
      fieldDefinitionId: string;
      value?: string;
      valueNumber?: number;
      valueDate?: Date;
      valueUserId?: string;
      valueJson?: any;
    }) => {
      const response = await client.api.tasks["custom-fields"].values.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to set custom field value");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
};

// Bulk set custom field values
export const useBulkSetCustomFieldValues = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      taskId: string;
      values: Array<{
        fieldDefinitionId: string;
        value?: string;
        valueNumber?: number;
        valueDate?: Date;
        valueUserId?: string;
        valueJson?: any;
      }>;
    }) => {
      const response = await client.api.tasks["custom-fields"].values.bulk.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to set custom field values");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
};

// Get issue types
export const useGetIssueTypes = (workspaceId: string) => {
  return useQuery({
    queryKey: ["issue-types", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"]["issue-types"].$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch issue types");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!workspaceId,
  });
};

// Create issue type
export const useCreateIssueType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      issueTypeName: string;
      issueTypeKey: string;
      description?: string;
      icon?: string;
      color?: string;
      isSubtaskType?: boolean;
      displayOrder?: number;
    }) => {
      const response = await client.api.tasks["custom-fields"]["issue-types"].$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to create issue type");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["issue-types", variables.workspaceId],
      });
    },
  });
};

// Get boards
export const useGetBoards = (workspaceId: string) => {
  return useQuery({
    queryKey: ["boards", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].boards.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch boards");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!workspaceId,
  });
};

// Create board
export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      projectId?: string;
      name: string;
      boardType: "KANBAN" | "SCRUM";
      description?: string;
      columns: Array<{
        id: string;
        name: string;
        statusMapping: string[];
        limit?: number;
        order: number;
      }>;
      filterConfig?: any;
      cardColorBy?: string;
      swimlanesBy?: string;
      sprintDurationWeeks?: number;
    }) => {
      const response = await client.api.tasks["custom-fields"].boards.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to create board");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["boards", variables.workspaceId],
      });
    },
  });
};

// Get sprints
export const useGetSprints = (boardId: string) => {
  return useQuery({
    queryKey: ["sprints", boardId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].sprints.$get({
        query: { boardId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sprints");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!boardId,
  });
};

// Create sprint
export const useCreateSprint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      boardId: string;
      name: string;
      goal?: string;
      startDate?: Date;
      endDate?: Date;
    }) => {
      const response = await client.api.tasks["custom-fields"].sprints.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to create sprint");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sprints", variables.boardId],
      });
    },
  });
};

// Start sprint
export const useStartSprint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      const response = await client.api.tasks["custom-fields"].sprints[":id"].start.$patch({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to start sprint");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sprints", variables.boardId],
      });
    },
  });
};

// Complete sprint
export const useCompleteSprint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      const response = await client.api.tasks["custom-fields"].sprints[":id"].complete.$patch({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to complete sprint");
      }

      const { data } = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sprints", variables.boardId],
      });
    },
  });
};
