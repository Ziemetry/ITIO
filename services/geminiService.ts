
import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "DUMMY_KEY" });

export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<ScanResult> => {
  // If no API key is present (common in demo envs), return mock data after delay
  if (!process.env.API_KEY) {
    console.warn("No API_KEY found. Using Mock Data for demonstration.");
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mocking a more complex corporate expense
        resolve({
          merchant: "OfficeMate Online",
          date: new Date().toISOString().split('T')[0],
          amount: 1250.00,
          category: Category.OFFICE_SUPPLIES,
          taxId: "0107542000011",
          address: "24 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กทม.",
          note: "สั่งซื้อกระดาษ A4 และหมึกพิมพ์สำหรับสำนักงาน"
        });
      }, 2500); // Simulate 2.5s scan time
    });
  }

  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        merchant: { type: Type.STRING, description: "The name of the store or merchant." },
        date: { type: Type.STRING, description: "Date in YYYY-MM-DD format." },
        amount: { type: Type.NUMBER, description: "The total amount paid." },
        category: { 
          type: Type.STRING, 
          enum: Object.values(Category),
          description: "The corporate accounting category of the expense."
        },
        taxId: { type: Type.STRING, description: "The Tax Identification Number (เลขประจำตัวผู้เสียภาษี) if available." },
        address: { type: Type.STRING, description: "The address of the merchant if available." },
        note: { type: Type.STRING, description: "A short summary of items bought in Thai (e.g., 'ค่าตั๋วเครื่องบินไปเชียงใหม่', 'ซื้อเมาส์และคีย์บอร์ด')." }
      },
      required: ["merchant", "amount", "category", "note"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: `You are an expert Corporate Accountant. Analyze this receipt/invoice. 
          
          1. Extract merchant, date, total amount, Tax ID, and Address.
          2. INTELLIGENTLY CATEGORIZE based on the items and merchant nature:
             - Buying paper, pens, ink? -> Office Supplies.
             - Grab/Taxi/Flight? -> Travel.
             - Restaurant with many people? -> Entertainment.
             - Restaurant for one? -> Meals.
             - AWS, Google Cloud, Adobe? -> Software.
             - Internet bill? -> Communication.
          3. Generate a short 'Note' in Thai summarizing what was paid for (e.g., 'ค่ารับรองลูกค้าโปรเจกต์ A', 'ค่าบริการ Cloud Server').
          ` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text);
    
    return {
      merchant: data.merchant || "Unknown Merchant",
      date: data.date || new Date().toISOString().split('T')[0],
      amount: data.amount || 0,
      category: data.category || Category.OTHER,
      taxId: data.taxId || "",
      address: data.address || "",
      note: data.note || ""
    };

  } catch (error) {
    console.error("Gemini Scan Error:", error);
    // Fallback to mock data on error to keep app usable
    return {
      merchant: "Error Reading Slip",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: Category.OTHER,
      note: "Could not analyze image"
    };
  }
};
