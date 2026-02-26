/**
 * ตัวอย่างโค้ดที่สมบูรณ์สำหรับการสมัคร Agent
 * 
 * ไฟล์นี้แสดงวิธีการใช้งานที่ถูกต้อง 100% สำหรับ:
 * 1. Insert agent data
 * 2. Upload PDF/image
 * 3. Update verification_documents JSON array
 * 4. Get agent info แบบไม่ error
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  completeAgentRegistration,
  getMyAgent,
  uploadDocument,
  addVerificationDocument,
  upsertAgent,
  getDocumentUrl,
} from "@/lib/services/agent-service";

/**
 * ตัวอย่างที่ 1: สมัคร Agent แบบครบถ้วน (แนะนำ)
 * รวม upload file + insert agent + update verification_documents ในครั้งเดียว
 */
export function Example1_CompleteRegistration() {
  const [loading, setLoading] = useState(false);

  const handleCompleteRegistration = async () => {
    setLoading(true);
    try {
      // 1. ตรวจสอบว่า user login แล้ว
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อน");
      }

      // 2. เตรียมข้อมูล Agent
      const agentData = {
        user_id: user.id, // ⚠️ สำคัญ: ต้องใช้ user.id จาก auth
        company_name: "บริษัทตัวอย่าง จำกัด",
        license_number: "LIC123456",
        business_license_id: "1234567890123", // เลขบัตรประชาชน 13 หลัก
        address: "123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10110",
        national_id: "1234567890123",
        property_types: ["sell", "rent"], // Array - จะแปลงเป็น jsonb อัตโนมัติ
        service_areas: ["กรุงเทพมหานคร", "ปทุมธานี"], // Array - จะแปลงเป็น jsonb อัตโนมัติ
        status: "pending" as const,
      };

      // 3. อัปโหลดไฟล์ (ถ้ามี)
      const fileInput = document.getElementById(
        "document-file"
      ) as HTMLInputElement;
      const file = fileInput?.files?.[0];

      // 4. สมัคร Agent (รวม upload + insert + update verification_documents)
      const agentRecord = await completeAgentRegistration(agentData, file);

      console.log("✅ สมัครสำเร็จ:", agentRecord);
      alert("สมัคร Agent สำเร็จ!");
    } catch (error: any) {
      console.error("❌ Error:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">ตัวอย่างที่ 1: สมัคร Agent แบบครบถ้วน</h2>
      <input
        id="document-file"
        type="file"
        accept="application/pdf,image/*"
        className="border p-2"
      />
      <button
        onClick={handleCompleteRegistration}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "กำลังสมัคร..." : "สมัคร Agent"}
      </button>
    </div>
  );
}

/**
 * ตัวอย่างที่ 2: แยกขั้นตอน (สำหรับกรณีที่ต้องการควบคุมมากขึ้น)
 */
export function Example2_StepByStep() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "create" | "done">("upload");

  const handleStepByStep = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

      const fileInput = document.getElementById(
        "document-file-2"
      ) as HTMLInputElement;
      const file = fileInput?.files?.[0];

      if (!file) {
        throw new Error("กรุณาเลือกไฟล์");
      }

      // Step 1: Upload file
      setStep("upload");
      const filePath = await uploadDocument(file, "business_license.pdf");
      console.log("✅ Uploaded:", filePath);
      const fileUrl = getDocumentUrl(filePath);
      console.log("📄 File URL:", fileUrl);

      // Step 2: Create agent record
      setStep("create");
      const agentData = {
        user_id: user.id,
        company_name: "บริษัทตัวอย่าง",
        business_license_id: "1234567890123",
        address: "123 ถนนตัวอย่าง",
        property_types: ["sell"],
        service_areas: ["กรุงเทพมหานคร"],
        status: "pending" as const,
      };

      const agentRecord = await upsertAgent(agentData);
      console.log("✅ Agent created:", agentRecord);

      // Step 3: Add document to verification_documents
      const updatedAgent = await addVerificationDocument(
        filePath,
        "business_license"
      );
      console.log("✅ Document added:", updatedAgent);

      setStep("done");
      alert("สำเร็จ!");
    } catch (error: any) {
      console.error("❌ Error:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">ตัวอย่างที่ 2: แยกขั้นตอน</h2>
      <div className="text-sm text-gray-600">
        ขั้นตอนปัจจุบัน: {step === "upload" && "กำลังอัปโหลด..."}
        {step === "create" && "กำลังสร้าง Agent..."}
        {step === "done" && "เสร็จสิ้น"}
      </div>
      <input
        id="document-file-2"
        type="file"
        accept="application/pdf,image/*"
        className="border p-2"
      />
      <button
        onClick={handleStepByStep}
        disabled={loading}
        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "กำลังดำเนินการ..." : "เริ่มต้น"}
      </button>
    </div>
  );
}

/**
 * ตัวอย่างที่ 3: ดึงข้อมูล Agent ของตัวเอง
 */
export function Example3_GetMyAgent() {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetAgent = async () => {
    setLoading(true);
    setError(null);
    try {
      const agentData = await getMyAgent();
      if (agentData) {
        setAgent(agentData);
        console.log("✅ Agent data:", agentData);
      } else {
        setError("ไม่พบข้อมูล Agent");
      }
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">ตัวอย่างที่ 3: ดึงข้อมูล Agent</h2>
      <button
        onClick={handleGetAgent}
        disabled={loading}
        className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "กำลังโหลด..." : "ดึงข้อมูล Agent"}
      </button>

      {error && (
        <div className="text-red-500 p-2 bg-red-50 rounded">{error}</div>
      )}

      {agent && (
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">ข้อมูล Agent:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(agent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * ตัวอย่างที่ 4: อัปเดต verification_documents เพิ่มเติม
 */
export function Example4_AddMoreDocuments() {
  const [loading, setLoading] = useState(false);

  const handleAddDocument = async () => {
    setLoading(true);
    try {
      const fileInput = document.getElementById(
        "additional-document"
      ) as HTMLInputElement;
      const file = fileInput?.files?.[0];

      if (!file) {
        throw new Error("กรุณาเลือกไฟล์");
      }

      // Upload file
      const filePath = await uploadDocument(file);
      console.log("✅ Uploaded:", filePath);

      // Add to verification_documents
      const updatedAgent = await addVerificationDocument(
        filePath,
        "additional_document"
      );
      console.log("✅ Document added:", updatedAgent);

      alert("เพิ่มเอกสารสำเร็จ!");
    } catch (error: any) {
      console.error("❌ Error:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">
        ตัวอย่างที่ 4: เพิ่มเอกสารเพิ่มเติม
      </h2>
      <input
        id="additional-document"
        type="file"
        accept="application/pdf,image/*"
        className="border p-2"
      />
      <button
        onClick={handleAddDocument}
        disabled={loading}
        className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "กำลังอัปโหลด..." : "เพิ่มเอกสาร"}
      </button>
    </div>
  );
}

/**
 * ตัวอย่างที่ 5: Query Agent แบบไม่ error (ใช้ RLS)
 */
export function Example5_QueryAgent() {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    try {
      // ✅ วิธีที่ถูกต้อง: ใช้ auth.getUser() แล้ว filter ด้วย user.id
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("กรุณาเข้าสู่ระบบ");
      }

      // Query ด้วย user_id = auth.uid() (จะผ่าน RLS policy อัตโนมัติ)
      const { data, error } = await supabase
        .from("agens")
        .select("*")
        .eq("user_id", user.id) // ⚠️ สำคัญ: ต้องใช้ user.id จาก auth
        .maybeSingle(); // ใช้ maybeSingle ถ้าอาจไม่มี row

      if (error) {
        throw error;
      }

      if (data) {
        setAgent(data);
        console.log("✅ Agent found:", data);
      } else {
        console.log("ℹ️ No agent record found");
        setAgent(null);
      }
    } catch (error: any) {
      console.error("❌ Error:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">ตัวอย่างที่ 5: Query Agent (RLS Safe)</h2>
      <button
        onClick={handleQuery}
        disabled={loading}
        className="bg-indigo-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "กำลังค้นหา..." : "ค้นหา Agent"}
      </button>

      {agent && (
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">ผลลัพธ์:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(agent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * ตัวอย่างที่ 6: React Native (Mobile) Upload
 */
export async function Example6_ReactNativeUpload() {
  // สำหรับ React Native ต้องใช้ library เช่น react-native-document-picker
  // และแปลง file URI เป็น Blob/Uint8Array

  /*
  import * as DocumentPicker from 'react-native-document-picker';
  import { supabase } from '@/lib/supabase';
  
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // แปลง URI เป็น Blob (ขึ้นกับ environment)
      const fileResponse = await fetch(res.uri);
      const blob = await fileResponse.blob();

      const fileExt = res.name?.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return filePath;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };
  */
}

/**
 * หน้าหลักที่รวมตัวอย่างทั้งหมด
 */
export default function AgentRegistrationExamples() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">
        ตัวอย่างการใช้งาน Agent Registration
      </h1>

      <div className="space-y-8">
        <Example1_CompleteRegistration />
        <Example2_StepByStep />
        <Example3_GetMyAgent />
        <Example4_AddMoreDocuments />
        <Example5_QueryAgent />
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">⚠️ สิ่งสำคัญ:</h3>
        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
          <li>
            ต้องรัน RLS policies จากไฟล์{" "}
            <code className="bg-yellow-100 px-1 rounded">
              supabase-migrations/rls-policies.sql
            </code>{" "}
            ใน Supabase Dashboard ก่อน
          </li>
          <li>
            ต้องแน่ใจว่า user login แล้วก่อนเรียกใช้ functions ใด ๆ
          </li>
          <li>
            ใช้ <code className="bg-yellow-100 px-1 rounded">user.id</code>{" "}
            จาก <code className="bg-yellow-100 px-1 rounded">auth.getUser()</code>{" "}
            เท่านั้น ห้ามใช้ user_id จาก input
          </li>
          <li>
            ส่ง <code className="bg-yellow-100 px-1 rounded">array</code>{" "}
            สำหรับ jsonb fields (property_types, service_areas) ไม่ต้องใช้{" "}
            <code className="bg-yellow-100 px-1 rounded">JSON.stringify()</code>
          </li>
        </ul>
      </div>
    </div>
  );
}

