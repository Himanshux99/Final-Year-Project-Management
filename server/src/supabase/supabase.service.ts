import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'project-attachments';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured. File uploads will fail.');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload a file to Supabase Storage
   * @param path Path in the bucket (e.g., "group-id/stage/filename")
   * @param file Buffer of the file
   * @param contentType MIME type of the file
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  /**
   * Delete a file from Supabase Storage
   * @param path Path in the bucket
   */
  async deleteFile(path: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for temporary access
   * @param path Path in the bucket
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}
