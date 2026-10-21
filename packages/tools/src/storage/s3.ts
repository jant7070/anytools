import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  assertValidKey,
  contentDisposition,
  type PutFileInput,
  type StorageProvider,
  type StoredFile,
} from "./types.js";

export interface S3StorageOptions {
  bucket: string;
  /** Custom endpoint for S3-compatible services, e.g. `https://<account>.r2.cloudflarestorage.com`. */
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  /** Objects older than this are removed by deleteExpired (listing has no custom metadata). */
  ttlSeconds: number;
}

/** S3-compatible storage (Cloudflare R2 in production). */
export class S3StorageProvider implements StorageProvider {
  readonly driver = "s3" as const;
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  async put(input: PutFileInput): Promise<void> {
    assertValidKey(input.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.data,
        ContentType: input.contentType,
        Metadata: {
          filename: encodeURIComponent(input.filename),
          "expires-at": input.expiresAt.toISOString(),
        },
      }),
    );
  }

  async get(key: string): Promise<StoredFile | null> {
    assertValidKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      const expiresAt = new Date(res.Metadata?.["expires-at"] ?? 0);
      if (!res.Body || expiresAt.getTime() <= Date.now()) return null;
      return {
        data: Buffer.from(await res.Body.transformToByteArray()),
        contentType: res.ContentType ?? "application/octet-stream",
        filename: decodeURIComponent(res.Metadata?.filename ?? "file"),
        expiresAt,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  async getDownloadUrl(
    key: string,
    options: { filename: string; expiresAt: Date },
  ): Promise<string> {
    assertValidKey(key);
    const expiresIn = Math.max(60, Math.floor((options.expiresAt.getTime() - Date.now()) / 1000));
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition(options.filename),
      }),
      { expiresIn },
    );
  }

  async deleteExpired(now = new Date()): Promise<number> {
    const cutoff = now.getTime() - this.options.ttlSeconds * 1000;
    let removed = 0;
    for (const prefix of ["inputs/", "results/"]) {
      let token: string | undefined;
      do {
        const page = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.options.bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        const expired = (page.Contents ?? []).filter(
          (o) => o.Key && o.LastModified && o.LastModified.getTime() < cutoff,
        );
        if (expired.length > 0) {
          await this.client.send(
            new DeleteObjectsCommand({
              Bucket: this.options.bucket,
              Delete: { Objects: expired.map((o) => ({ Key: o.Key })), Quiet: true },
            }),
          );
          removed += expired.length;
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
    }
    return removed;
  }
}
