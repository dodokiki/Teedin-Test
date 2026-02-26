/**
 * Agent Service - Functions for agent operations
 * Handles agent registration, document uploads, and data management
 */

import { supabase } from "@/lib/supabase";

export interface AgentData {
  user_id: string;
  company_name?: string | null;
  license_number?: string | null;
  business_license_id: string;
  address: string;
  national_id?: string | null;
  property_types: string[]; // Array of strings, will be stored as jsonb
  service_areas: string[]; // Array of strings, will be stored as jsonb
  verification_documents?: Array<{
    path: string;
    type: string;
    uploaded_at: string;
  }>;
  status?: "pending" | "approved" | "rejected";
}

export interface VerificationDocument {
  path: string;
  type: string;
  uploaded_at: string;
}

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated. Please login first.");
  }

  return user;
}

/**
 * Upload a file to documents bucket
 * @param file - File to upload
 * @param fileName - Optional custom file name (default: timestamp-based)
 * @returns File path in storage
 */
export async function uploadDocument(
  file: File,
  fileName?: string
): Promise<string> {
  const user = await getCurrentUser();

  const fileExt = file.name.split(".").pop() || "pdf";
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const finalFileName =
    fileName || `${timestamp}-${randomString}.${fileExt}`;
  const filePath = `${user.id}/${finalFileName}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/pdf",
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(
      `Failed to upload document: ${error.message}. Make sure RLS policies are set correctly.`
    );
  }

  return filePath;
}

/**
 * Get public URL for a document
 * @param filePath - Path to file in storage
 * @returns Public URL
 */
export function getDocumentUrl(filePath: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Create or update agent record
 * @param agentData - Agent data to insert/update
 * @returns Created/updated agent record
 */
export async function upsertAgent(agentData: AgentData) {
  const user = await getCurrentUser();

  // Ensure user_id matches authenticated user
  if (agentData.user_id !== user.id) {
    throw new Error("user_id must match authenticated user");
  }

  // Prepare data for database (convert arrays to jsonb-compatible format)
  const dbData = {
    user_id: agentData.user_id,
    company_name: agentData.company_name || null,
    license_number: agentData.license_number || null,
    business_license_id: agentData.business_license_id,
    address: agentData.address,
    national_id: agentData.national_id || null,
    property_types: agentData.property_types, // Supabase will convert to jsonb automatically
    service_areas: agentData.service_areas, // Supabase will convert to jsonb automatically
    verification_documents:
      agentData.verification_documents || [], // Supabase will convert to jsonb automatically
    status: agentData.status || "pending",
    updated_at: new Date().toISOString(),
  };

  // Check if agent record exists
  const { data: existingAgent, error: checkError } = await supabase
    .from("agens")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing agent: ${checkError.message}`);
  }

  if (existingAgent) {
    // Update existing record
    const { data, error } = await supabase
      .from("agens")
      .update(dbData)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from("agens")
      .insert({
        ...dbData,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return data;
  }
}

/**
 * Get agent record for current user
 * @returns Agent record or null if not found
 */
export async function getMyAgent() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("agens")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch agent: ${error.message}`);
  }

  return data;
}

/**
 * Add verification document to agent record
 * @param filePath - Path to uploaded file in storage
 * @param documentType - Type of document (e.g., "id_card", "business_license")
 * @returns Updated agent record
 */
export async function addVerificationDocument(
  filePath: string,
  documentType: string = "identity_document"
) {
  const user = await getCurrentUser();

  // Get current agent record
  const { data: agent, error: fetchError } = await supabase
    .from("agens")
    .select("verification_documents")
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch agent: ${fetchError.message}`);
  }

  if (!agent) {
    throw new Error("Agent record not found. Please create agent first.");
  }

  // Parse existing documents (handle both array and string formats)
  let existingDocs: VerificationDocument[] = [];
  if (agent.verification_documents) {
    if (typeof agent.verification_documents === "string") {
      try {
        existingDocs = JSON.parse(agent.verification_documents);
      } catch {
        existingDocs = [];
      }
    } else if (Array.isArray(agent.verification_documents)) {
      existingDocs = agent.verification_documents;
    }
  }

  // Add new document
  const newDoc: VerificationDocument = {
    path: filePath,
    type: documentType,
    uploaded_at: new Date().toISOString(),
  };

  const updatedDocs = [...existingDocs, newDoc];

  // Update agent record
  const { data, error } = await supabase
    .from("agens")
    .update({
      verification_documents: updatedDocs,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update verification documents: ${error.message}`);
  }

  return data;
}

/**
 * Complete agent registration flow:
 * 1. Upload document
 * 2. Create/update agent record
 * 3. Add document to verification_documents
 * @param agentData - Agent data
 * @param documentFile - Optional document file to upload
 * @returns Complete agent record
 */
export async function completeAgentRegistration(
  agentData: Omit<AgentData, "verification_documents">,
  documentFile?: File
) {
  const user = await getCurrentUser();

  let documentPath: string | null = null;

  // Step 1: Upload document if provided
  if (documentFile) {
    try {
      documentPath = await uploadDocument(documentFile);

    } catch (error) {
      console.error("❌ Document upload failed:", error);
      throw error;
    }
  }

  // Step 2: Create/update agent record
  const agentRecord = await upsertAgent({
    ...agentData,
    user_id: user.id,
    verification_documents: [],
  });


  // Step 3: Add document to verification_documents if uploaded
  if (documentPath) {
    try {
      const updatedAgent = await addVerificationDocument(
        documentPath,
        "identity_document"
      );

      return updatedAgent;
    } catch (error) {
      console.error("❌ Failed to add verification document:", error);
      // Don't throw - agent record is already created
      return agentRecord;
    }
  }

  return agentRecord;
}

