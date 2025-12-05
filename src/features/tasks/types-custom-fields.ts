// Custom Field System Types (Jira-like dynamic fields)

export enum CustomFieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  DATETIME = "DATETIME",
  SELECT = "SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  USER = "USER",
  MULTI_USER = "MULTI_USER",
  CHECKBOX = "CHECKBOX",
  URL = "URL",
  EMAIL = "EMAIL",
  TEXTAREA = "TEXTAREA",
  LABELS = "LABELS",
  EPIC_LINK = "EPIC_LINK",
  SPRINT = "SPRINT",
}

export type CustomFieldDefinition = {
  id: string;
  workspaceId: string;
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  fieldDescription?: string;
  isRequired: boolean;
  defaultValue?: string;
  
  // Configuration
  fieldOptions?: {
    options?: string[];
    allowCustom?: boolean;
    cascadeFrom?: string; // For dependent fields
  };
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  
  // Applicability
  appliesToIssueTypes?: string[]; // ["Task", "Bug", "Story"]
  appliesToProjects?: string[]; // Project IDs
  
  // UI Configuration
  displayOrder: number;
  isVisibleInList: boolean;
  isVisibleInDetail: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  
  // System fields
  isSystemField: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomFieldValue = {
  id: string;
  taskId: string;
  fieldDefinitionId: string;
  value?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueUserId?: string;
  valueJson?: any;
  createdAt: string;
  updatedAt: string;
};

export type IssueTypeConfig = {
  id: string;
  workspaceId: string;
  issueTypeName: string;
  issueTypeKey: string;
  description?: string;
  icon?: string;
  color?: string;
  isSubtaskType: boolean;
  workflowId?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStatus = {
  key: string;
  name: string;
  category: 'TODO' | 'IN_PROGRESS' | 'DONE'; // For grouping
  color?: string;
};

export type WorkflowTransition = {
  id: string;
  name: string;
  from: string; // Status key
  to: string; // Status key
  rules?: {
    requireComment?: boolean;
    requireResolution?: boolean;
    requireFields?: string[]; // Field keys that must be filled
  };
};

export type Workflow = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BoardColumn = {
  id: string;
  name: string;
  statusMapping: string[]; // Which statuses map to this column
  limit?: number; // WIP limit
  order: number;
};

export type BoardConfig = {
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  boardType: 'KANBAN' | 'SCRUM';
  description?: string;
  
  // Column configuration
  columns: BoardColumn[];
  
  // Filter configuration
  filterConfig?: {
    issueTypes?: string[];
    assignees?: string[];
    labels?: string[];
    customFilters?: Record<string, any>;
  };
  
  // Display settings
  cardColorBy: 'PRIORITY' | 'ISSUE_TYPE' | 'ASSIGNEE' | 'CUSTOM_FIELD';
  swimlanesBy?: 'NONE' | 'ASSIGNEE' | 'PRIORITY' | 'EPIC' | 'CUSTOM_FIELD';
  
  // Scrum specific
  sprintDurationWeeks?: number;
  
  isFavorite: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type Sprint = {
  id: string;
  workspaceId: string;
  boardId: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  state: 'FUTURE' | 'ACTIVE' | 'CLOSED';
  completedAt?: Date;
  createdAt: string;
  updatedAt: string;
};

export type SprintTask = {
  id: string;
  sprintId: string;
  taskId: string;
  addedAt: string;
  removedAt?: string;
};

// Enhanced Task type with custom fields
export type TaskWithCustomFields = {
  id: string;
  summary: string;
  issueId: string;
  issueType: string;
  status: string;
  // ... other standard fields
  customFields?: Record<string, CustomFieldValue>; // Key is field_key
};

// API Payloads
export type CreateCustomFieldPayload = {
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
};

export type UpdateCustomFieldPayload = Partial<CreateCustomFieldPayload>;

export type SetCustomFieldValuePayload = {
  taskId: string;
  fieldDefinitionId: string;
  value?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueUserId?: string;
  valueJson?: any;
};

export type CreateIssueTypePayload = {
  issueTypeName: string;
  issueTypeKey: string;
  description?: string;
  icon?: string;
  color?: string;
  isSubtaskType?: boolean;
};

export type CreateBoardPayload = {
  name: string;
  boardType: 'KANBAN' | 'SCRUM';
  description?: string;
  projectId?: string;
  columns: BoardColumn[];
  filterConfig?: any;
};

export type CreateSprintPayload = {
  boardId: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
};
