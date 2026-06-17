import { createClient } from '@supabase/supabase-js';

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (!rawUrl) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not set.');
}

// Sanitize URL by removing any trailing /rest/v1 or /rest/v1/ suffixes
let sanitizedUrl = rawUrl.trim();
if (sanitizedUrl.endsWith('/rest/v1/')) {
  sanitizedUrl = sanitizedUrl.slice(0, -9);
} else if (sanitizedUrl.endsWith('/rest/v1')) {
  sanitizedUrl = sanitizedUrl.slice(0, -8);
}
if (sanitizedUrl.endsWith('/')) {
  sanitizedUrl = sanitizedUrl.slice(0, -1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set.');
}

export const supabaseAdmin = createClient(
  sanitizedUrl || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

/**
 * Ensures a Supabase storage bucket exists by creating it if it doesn't.
 * Swallows errors if it already exists or list fails.
 */
export async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    const exists = buckets.some((b) => b.name === bucketName);
    if (!exists) {
      console.log(`Bucket "${bucketName}" not found. Creating it...`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false, // private bucket as per spec
      });
      if (createError) {
        console.error(`Failed to create bucket "${bucketName}":`, createError);
      } else {
        console.log(`Bucket "${bucketName}" created successfully.`);
      }
    }
  } catch (err) {
    console.error(`Error ensuring bucket "${bucketName}" exists:`, err);
  }
}
