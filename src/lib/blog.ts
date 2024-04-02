import {
  createClient,
  type MicroCMSImage,
  type MicroCMSListContent,
} from "microcms-js-sdk";

type MicroCMSClient = ReturnType<typeof createClient>;
type HTML = string;
type Category = MicroCMSListContent & { name: string };
type PostBase = {
  title: string;
  content: HTML;
  eyecatch?: MicroCMSImage;
  category?: Category;
};
type AnnouncementBase = {
  content: HTML;
  title: string;
  category?: Category;
};
type Webhook = {
  service: string;
  api: string;
  id: string | null;
  type: "new" | "edit" | "delete";
  // we don't care
  content: object | null;
};

const DOMAIN = "ccid7z175c";
const BLOG_API = "blog";
const ANNOUNCEMENT_API = "news";

export class ContentClient {
  protected client: MicroCMSClient;
  constructor(private secret: string, private kv: KVNamespace) {
    this.client = createClient({
      serviceDomain: DOMAIN,
      apiKey: this.secret,
    });
  }

  protected async getAllContents<T extends object>(endpoint: string) {
    const kvName = endpoint;
    let res: (MicroCMSListContent & T)[];
    try {
      res = JSON.parse((await this.kv.get(kvName)) ?? "");
    } catch {
      res = await this.client.getAllContents<T>({
        endpoint,
        queries: {
          orders: "createdAt",
        },
      });
      // It may fail due to rate limit issues etc.
      try {
        await this.kv.put(kvName, JSON.stringify(res));
      } catch {}
    }

    return res;
  }

  protected async getContentFromId<T extends object>(
    endpoint: string,
    contentId: string
  ) {
    const kvName = endpoint;
    let res: MicroCMSListContent & T;
    if (kvName.includes("."))
      throw new TypeError(
        '"." is used as a delimiter so cannot be used as a store name'
      );

    try {
      res = JSON.parse((await this.kv.get(`${kvName}.${contentId}`)) ?? "");
    } catch {
      res = await this.client.getListDetail<T>({
        endpoint,
        contentId,
      });

      // It may fail due to rate limit issues etc.
      try {
        await this.kv.put(`${kvName}.${contentId}`, JSON.stringify(res));
      } catch {}
    }

    return res;
  }

  protected async getDraft<T extends object>(
    endpoint: string,
    contentId: string,
    draftKey: string
  ) {
    return await this.client.getListDetail<T>({
      endpoint,
      contentId,
      queries: { draftKey },
    });
  }

  async getAllPosts() {
    return await this.getAllContents<PostBase>(BLOG_API);
  }

  async getAllAnnouncements() {
    return await this.getAllContents<AnnouncementBase>(ANNOUNCEMENT_API);
  }

  async getPost(id: string) {
    return await this.getContentFromId<PostBase>(BLOG_API, id);
  }

  async getAnnouncement(id: string) {
    return await this.getContentFromId<AnnouncementBase>(ANNOUNCEMENT_API, id);
  }

  async searchBlog(q: string, page: number = 0) {
    const result = await this.client.getList<PostBase>({
      endpoint: BLOG_API,
      queries: {
        q,
        limit: 10,
        orders: "publishedAt",
        offset: page * 10,
      },
    });
    const { contents } = result;
    return {
      next: (page + 1) * 10 < result.totalCount,
      back: page !== 0,
      contents,
    };
  }

  async getBlogDraft(id: string, draftKey: string) {
    return await this.getDraft<PostBase>(BLOG_API, id, draftKey);
  }

  static async webhookDelete(
    rawBody: string,
    signatureOptions: { key: string; signature: string },
    kv: KVNamespace
  ) {
    const keyAlgorithm = { name: "HMAC", hash: "SHA-256" };
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(signatureOptions.key),
      keyAlgorithm,
      false,
      ["sign", "verify"]
    );
    const vaild = crypto.subtle.verify(
      keyAlgorithm,
      secretKey,
      encoder.encode(signatureOptions.signature),
      encoder.encode(rawBody)
    );

    if (!vaild) throw new RangeError("An invalid signature was passed");

    const bodyParsed: Webhook = JSON.parse(rawBody);

    return await kv.delete(
      `${bodyParsed.api}${bodyParsed.id ? `.${bodyParsed.id}` : ""}`
    );
  }
}
