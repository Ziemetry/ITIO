
import { Transaction } from "../types";

export const saveToGoogleSheet = async (scriptUrl: string, transaction: Transaction): Promise<boolean> => {
  try {
    // We use text/plain for the Content-Type to avoid triggering a CORS preflight (OPTIONS request),
    // which simplifies the Google Apps Script backend requirements.
    const payload = JSON.stringify({
      ...transaction,
      source: 'BillScannerApp'
    });

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 
        "Content-Type": "text/plain;charset=utf-8" 
      },
      body: payload
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Google Apps Script Web Apps often return a redirect or simple JSON.
    // If we get here without throwing, the network request succeeded.
    return true;
  } catch (error) {
    console.error("Google Sheet Sync Error:", error);
    throw error;
  }
};
