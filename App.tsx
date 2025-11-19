
import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, UploadIcon, CheckIcon, HomeIcon, ListIcon, SettingsIcon } from './components/Icons';
import ScanOverlay from './components/ScanOverlay';
import { analyzeReceipt } from './services/geminiService';
import { saveToGoogleSheet } from './services/sheetService';
import { Transaction, Category, ScanResult } from './types';

const App: React.FC = () => {
  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ScanResult>({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: 0,
    category: Category.OFFICE_SUPPLIES,
    taxId: '',
    address: '',
    note: ''
  });

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const savedUrl = localStorage.getItem('googleSheetUrl');
    if (savedUrl) setSheetUrl(savedUrl);
  }, []);

  // --- Handlers ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Preview Image
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      
      // 2. Start Scanning Process
      setIsScanning(true);
      setShowForm(false); // Hide form if previously shown

      // Get raw base64 data (remove prefix)
      const base64Data = base64String.split(',')[1];
      
      // 3. Call Gemini Service
      const result = await analyzeReceipt(base64Data, file.type);
      
      // 4. Update Form & Stop Scanning
      setFormData(result);
      setIsScanning(false);
      setShowForm(true);

      // Scroll to form
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('googleSheetUrl', sheetUrl);
    setIsSettingsOpen(false);
    alert('บันทึก URL เรียบร้อยแล้ว');
  };

  const handleSave = async () => {
    if (!formData.merchant || formData.amount <= 0) {
      alert("กรุณากรอกข้อมูลร้านค้าและยอดเงินให้ถูกต้อง");
      return;
    }

    setSaveStatus('saving');

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ...formData,
      timestamp: Date.now()
    };

    // 1. Save to Google Sheet (if configured)
    if (sheetUrl) {
      try {
        await saveToGoogleSheet(sheetUrl, newTransaction);
      } catch (error) {
        console.error("Failed to save to sheet", error);
        alert("บันทึกลง Google Sheet ไม่สำเร็จ แต่ข้อมูลถูกบันทึกในแอปแล้ว");
      }
    } else {
      // Simulate delay if only local
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 2. Save Locally
    setTransactions(prev => [newTransaction, ...prev]);
    setSaveStatus('success');

    // Reset after delay
    setTimeout(() => {
      setSaveStatus('idle');
      setShowForm(false);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 1500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <CameraIcon className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Bill Scanner AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium bg-brand-50 text-brand-600 px-2 py-1 rounded-full">
                Pro
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-brand-600 transition-colors">
                <SettingsIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-brand-600" />
              ตั้งค่า Google Sheet
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Google Apps Script Web App URL</label>
                <input 
                  type="text" 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl text-sm text-slate-700 space-y-2 border border-blue-100">
                <p className="font-bold text-blue-800">วิธีติดตั้ง:</p>
                <ol className="list-decimal pl-4 space-y-1 text-xs leading-relaxed">
                  <li>สร้าง Google Sheet ใหม่ {'>'} Extensions {'>'} Apps Script</li>
                  <li>ลบโค้ดเดิม และวางโค้ดด้านล่างนี้ลงไป</li>
                  <li>กด Deploy {'>'} New deployment</li>
                  <li>เลือก Type: Web app</li>
                  <li>Who has access: <strong>Anyone</strong> (สำคัญมาก!)</li>
                  <li>Copy URL ที่ได้มาวางในช่องด้านบน</li>
                </ol>
              </div>

              <div className="relative group">
                <pre className="bg-slate-800 text-slate-200 p-3 rounded-xl text-[10px] overflow-x-auto font-mono border border-slate-700">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    data.date, 
    data.merchant, 
    data.amount, 
    data.category, 
    data.taxId, 
    data.address, 
    data.note,
    new Date() // Timestamp
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                </pre>
                <div className="absolute top-2 right-2 text-[10px] text-slate-400 bg-slate-700 px-2 py-1 rounded">Apps Script Code</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white font-bold shadow-lg hover:bg-brand-700 transition-colors"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* 1. Upload Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-4">
          <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden group hover:border-brand-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Slip" className="w-full h-full object-cover" />
                <ScanOverlay isScanning={isScanning} />
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadIcon className="w-8 h-8 text-brand-600" />
                </div>
                <p className="text-slate-500 font-medium">แตะเพื่อถ่ายรูปใบเสร็จ / ใบกำกับภาษี</p>
                <p className="text-slate-400 text-xs mt-1">รองรับ .jpg, .png</p>
              </>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* 2. Auto-filled Form (Shows after scan) */}
        {showForm && (
          <div ref={scrollRef} className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">ตรวจสอบข้อมูลบัญชี</h2>
              <span className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                AI Analyzed
              </span>
            </div>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">วันที่ (Date)</label>
                <input 
                  type="date" 
                  name="date"
                  value={formData.date} 
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-medium text-slate-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">ชื่อร้านค้า (Merchant)</label>
                <input 
                  type="text" 
                  name="merchant"
                  value={formData.merchant} 
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-medium text-slate-700"
                  placeholder="เช่น 7-Eleven"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">ยอดเงิน (Total)</label>
                    <div className="relative">
                        <input 
                        type="number" 
                        name="amount"
                        value={formData.amount} 
                        onChange={handleInputChange}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-bold text-slate-800 text-right pr-4"
                        />
                        <span className="absolute left-3 top-3 text-slate-400 text-sm">฿</span>
                    </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">เลขภาษี (Tax ID)</label>
                        <input 
                        type="text" 
                        name="taxId"
                        value={formData.taxId || ''} 
                        onChange={handleInputChange}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-medium text-slate-700"
                        placeholder="ถ้ามี"
                        />
                    </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-500 mb-1">หมวดหมู่บัญชี (Category)</label>
                   <select 
                      name="category"
                      value={formData.category} 
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-slate-700 appearance-none text-sm"
                   >
                     {Object.values(Category).map(cat => (
                       <option key={cat} value={cat}>{cat}</option>
                     ))}
                   </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">บันทึกช่วยจำ (Memo/Note)</label>
                  <textarea 
                      name="note"
                      rows={2}
                      value={formData.note || ''} 
                      onChange={handleInputChange}
                      className="w-full p-3 bg-brand-50 rounded-xl border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-medium text-slate-700 resize-none"
                      placeholder="รายละเอียดรายการ (AI จะช่วยสรุปให้)"
                    />
                </div>
              </div>

              {/* Address (Collapsed/Separated) */}
              <div className="pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">ที่อยู่ร้านค้า (Address)</label>
                    <textarea 
                      name="address"
                      rows={2}
                      value={formData.address || ''} 
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all font-medium text-slate-700 resize-none text-sm"
                      placeholder="ที่อยู่ตามใบกำกับภาษี"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={saveStatus === 'saving' || saveStatus === 'success'}
                className={`w-full mt-4 py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                  ${saveStatus === 'success' ? 'bg-green-500' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-200'}
                `}
              >
                {saveStatus === 'saving' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    กำลังบันทึก...
                  </span>
                ) : saveStatus === 'success' ? (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5" /> บันทึกสำเร็จ
                  </span>
                ) : (
                  "ยืนยันและบันทึก"
                )}
              </button>
              
              {/* Connection Status Indicator */}
              <div className="text-center">
                 <span className={`text-[10px] ${sheetUrl ? 'text-green-600' : 'text-slate-400'}`}>
                    {sheetUrl ? '● เชื่อมต่อ Google Sheet แล้ว' : '○ บันทึกลงเครื่องเท่านั้น (ตั้งค่าเพื่อเชื่อมต่อ Cloud)'}
                 </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Transactions List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider ml-1">รายการล่าสุด</h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-100 border-dashed">
               <p className="text-slate-400">ยังไม่มีรายการบันทึก</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start animate-fade-in">
                <div className="flex items-start gap-4 overflow-hidden">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1
                    bg-slate-100 text-slate-600
                  `}>
                    <span className="font-bold text-sm">{tx.category.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{tx.merchant}</p>
                    <p className="text-xs text-slate-500 flex flex-wrap gap-1 mb-1">
                      {tx.date} • {tx.category.split('(')[0]}
                      {tx.taxId && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium">TAX</span>}
                    </p>
                    {tx.note && (
                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md mt-1 text-xs leading-relaxed">
                            {tx.note}
                        </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-bold text-slate-800 block">{formatCurrency(tx.amount)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </main>

      {/* Bottom Navigation (Mock) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50 pb-safe">
        <button className="flex flex-col items-center gap-1 text-brand-600">
          <HomeIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">หน้าหลัก</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-500">
          <ListIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">บัญชีบริษัท</span>
        </button>
      </nav>

      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
         @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
