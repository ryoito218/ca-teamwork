export async function storagePut(
  bucket: R2Bucket,
  key: string,
  data: Uint8Array,
  contentType: string,
  publicBaseUrl: string,
): Promise<{ key: string; url: string }> {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
  const url = `${publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  return { key, url };
}

export async function storageDelete(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}
