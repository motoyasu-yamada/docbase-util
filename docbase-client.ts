import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Docbase} from './docbase-types';
export * from './docbase-types';

import base64Arraybuffer from 'base64-arraybuffer';
import { exit } from 'process';


export class DocbaseClient 
{
  private config: Docbase.Config;
  private axios: AxiosInstance;

  constructor(config: Docbase.Config) {
    this.config = config;
    const headers = {
      'X-DocBaseToken': config.token, 
      'X-Api-Version': 2, 
      'Content-Type': 'application/json'
    };
    
    this.axios = axios.create({ baseURL: 'https://api.docbase.io/', headers: headers });
  }

  async getPosts(q = '*', page = 1, per_page = 20) : Promise<Docbase.GetMemosResult> {
    return await this.get<Docbase.GetMemosResult>('/teams/:domain/posts', { params: { q, page, per_page} });
  }

  async deletePost(id: number) : Promise<Docbase.GetMemosResult> {
    return await this.delete<Docbase.GetMemosResult>(`/teams/:domain/posts/${id}`);
  }

  async getAttachment(id: number) : Promise<ArrayBuffer> {
    return await this.get<Docbase.GetAttachmentResult>(`/teams/:domain/attachments/${id}`, { responseType: 'arraybuffer'});
  }

  async postAttachment(attachments : {name: string, content: ArrayBuffer}[], author_id?: number) : Promise<Docbase.PostAttachmentResponse> {
    const upload: Docbase.PostAttachmentRequest = attachments.map( ({name,content}) : {name:string, content:string, author_id: number | undefined} => ({
      name, content:base64Arraybuffer.encode(content), author_id
    }));
    return await this.post<Docbase.PostAttachmentResponse, Docbase.PostAttachmentRequest>(`/teams/:domain/attachments`, upload);
  }

  async postMemo(memo: Docbase.PostMemoRequest) : Promise<Docbase.PostMemoResponse>  {
    return await this.post<Docbase.PostMemoResponse, Docbase.PostMemoRequest>(`/teams/:domain/posts`, memo);
  }

  async updateMemo(memo: Docbase.UpdateMemoRequest) : Promise<Docbase.UpdateMemoResponse>  {
    return await this.patch<Docbase.UpdateMemoResponse, Docbase.UpdateMemoRequest>(`/teams/:domain/posts/${memo.id}`, memo);
  }
  
  async postComment(id: number, body: string, author_id?: number, published_at?: string) : Promise<void> {
    const comment = { 
      body: body,
      author_id,
      published_at
    };
    await this.post<Docbase.PostCommentResponse, Docbase.PostCommentRequest>(`/teams/:domain/posts/${id}/comments`, comment);
  }

  async get<T>(url: string, config?: AxiosRequestConfig) : Promise<T> {
    url = url.replace(':domain', this.config.domain);
    const { data } = await axios_executor(() => this.axios.get<T>(url, config));
    return data;
  }

  async post<RS,RQ>(url: string, postData: RQ, config?: AxiosRequestConfig): Promise<RS> {
    url = url.replace(':domain', this.config.domain);
    const { data } = await axios_executor( () => this.axios.post<RS>(url, postData, config));
    return data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) : Promise<T> {
    url = url.replace(':domain', this.config.domain);
    const { data } = await axios_executor( () => this.axios.delete<T>(url, config));
    return data;
  }

  async patch<RS,RQ>(url: string, postData: RQ, config?: AxiosRequestConfig) : Promise<RS> {
    url = url.replace(':domain', this.config.domain);
    const { data } = await axios_executor(() => this.axios.patch<RS>(url, postData, config));
    return data;
  }

}

const sleep = (msec:number):Promise<void> => new Promise(resolve => setTimeout(resolve, msec));

async function axios_executor<RS>(fn: () => Promise<RS>) : Promise<RS> {
  for(;;) {
    try {
      return await fn();
    } catch(e) {
      if (!axios.isAxiosError(e)) {
        throw e;
      }
      if (e.response?.status != 429) {
        console.error(`Error happened when axiosing\r\n
        ********************\r\n
        Message: ${e.message}\r\n
        Status: ${e.response?.status} ${e.response?.statusText}\r\n
        ********************\r\n
        `);
        console.dir(e.response?.headers);
        exit(-1);
      }
      const resetMsec = parseInt(e.response?.headers['x-ratelimit-reset']) * 1000;
      const nowMsec = new Date().getTime(); 
      const waitMsec = resetMsec - nowMsec;
      console.log(`waiting  ${waitMsec} msec till ${new Date(resetMsec)}`);
      await sleep(waitMsec);
    }
  }
}
