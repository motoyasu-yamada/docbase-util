export namespace Docbase {
  export type  Config = {
    domain: string,
    token: string,
    wait?: number
  };
  
  export type ImportConfig = Config & {
    groups: [number],
    author_id: number
  };
  
  export type ExportConfig = Config;

  export type User = {
    id: number;
    name: string;
    profile_image_url: string;
  };
  export type Group = {
    id: number;
    name: string;
  };
  export type Attachment = {
    id: number;
    name: string;
    url: string;
    created_at: string;
  };
  export type Comment = { body: string; created_at: string };
  export type Tag = { id: number; name: string };

  export type Memo = {
    id: number;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
    comments: Comment[];
    attachments: Attachment[];
    tags: Tag[];
    user: User;
    groups: Group[];
    sharing_url: string;
  };

  export type GetMemosResult = {
    posts: Memo[];
    meta: {
      total: number;
    };
  };

  export type UpdateMemoRequest = {
    id: number;
    title?: string;
    body?: string;
    tags?: string[];
    groups?: number[];
    published_at?: string;
    author_id?: number;
  };
  export type UpdateMemoResponse = Memo;

  export type PostMemoRequest = {
    title: string;
    body: string;
    tags: string[];
    scope?: 'everyone' | 'group' | 'private';
    groups?: number[];
    published_at?: string;
    author_id?: number;
  };
  export type PostMemoResponse = Memo;
  export type GetAttachmentResult = ArrayBuffer;
  export type PostCommentRequest = {
    body: string;
    published_at?: string;
    author_id?: number;
  };
  export type PostCommentResponse = {};
  export type PostAttachmentRequest = { name: string; content: string; author_id?: number }[];
  export type PostAttachmentResponse = { id: string; name: string; url: string }[];
}
