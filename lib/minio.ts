import { randomUUID } from "node:crypto";
import { Client } from "minio";

type MinioConfig = {
  client: Client;
  bucket: string;
  publicBaseUrl: string | null;
  endpointUrl: URL;
};

function parseEndpoint(endpointRaw: string) {
  const normalized = /^https?:\/\//i.test(endpointRaw)
    ? endpointRaw
    : `http://${endpointRaw}`;
  return new URL(normalized);
}

function getMinioConfig(): MinioConfig {
  const endpointRaw = process.env.MINIO_ENDPOINT?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();
  const bucket = process.env.MINIO_BUCKET?.trim();
  const publicBaseUrlRaw = process.env.MINIO_PUBLIC_BASE_URL?.trim();

  if (!endpointRaw) throw new Error("MINIO_ENDPOINT is not configured");
  if (!accessKey) throw new Error("MINIO_ACCESS_KEY is not configured");
  if (!secretKey) throw new Error("MINIO_SECRET_KEY is not configured");
  if (!bucket) throw new Error("MINIO_BUCKET is not configured");

  const endpointUrl = parseEndpoint(endpointRaw);
  const useSSL = endpointUrl.protocol === "https:";
  const port = endpointUrl.port ? Number(endpointUrl.port) : useSSL ? 443 : 80;

  const client = new Client({
    endPoint: endpointUrl.hostname,
    port,
    useSSL,
    accessKey,
    secretKey,
    region: process.env.MINIO_REGION?.trim() || "us-east-1",
  });

  return {
    client,
    bucket,
    publicBaseUrl: publicBaseUrlRaw || null,
    endpointUrl,
  };
}

function buildObjectUrl(objectKey: string, cfg: MinioConfig) {
  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const base = cfg.publicBaseUrl
    ? cfg.publicBaseUrl.replace(/\/+$/, "")
    : `${cfg.endpointUrl.protocol}//${cfg.endpointUrl.host}`;
  return `${base}/${cfg.bucket}/${encodedKey}`;
}

function getFileExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export async function uploadSilaturahimProof(input: {
  userId: string;
  data: Buffer;
  mimeType: string;
}) {
  const cfg = getMinioConfig();
  const ext = getFileExtension(input.mimeType);
  const objectKey = `silaturahim/${input.userId}/${Date.now()}-${randomUUID()}.${ext}`;

  await cfg.client.putObject(
    cfg.bucket,
    objectKey,
    input.data,
    input.data.length,
    {
      "Content-Type": input.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  );

  return {
    objectKey,
    url: buildObjectUrl(objectKey, cfg),
  };
}

export async function getSilaturahimProofReadUrl(
  objectKey: string,
  expirySeconds = 60 * 60,
) {
  const cfg = getMinioConfig();
  return cfg.client.presignedGetObject(cfg.bucket, objectKey, expirySeconds);
}
