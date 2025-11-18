export type Project = {
  id: string;
  name: string;
  imageUrl: string | null;
  workspaceId: string | null;
  postDate?: string | null;
  tentativeEndDate?: string | null;
  assignees?: string[] | null;
  createdAt: string;
  updatedAt: string;
};
