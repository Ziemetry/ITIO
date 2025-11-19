
export enum Category {
  OFFICE_SUPPLIES = 'Office Supplies (วัสดุสำนักงาน)',
  TRAVEL = 'Travel & Transportation (ค่าเดินทาง)',
  MEALS = 'Meals & Beverage (อาหารและเครื่องดื่ม)',
  ENTERTAINMENT = 'Entertainment (ค่ารับรอง)',
  COMMUNICATION = 'Communication & Internet (ค่าโทรศัพท์/เน็ต)',
  UTILITIES = 'Utilities (สาธารณูปโภค)',
  SOFTWARE = 'Software & Licenses (ค่าซอฟต์แวร์)',
  MARKETING = 'Marketing (การตลาด/โฆษณา)',
  MAINTENANCE = 'Repair & Maintenance (ค่าซ่อมแซม)',
  FEES = 'Fees & Taxes (ค่าธรรมเนียม)',
  EQUIPMENT = 'Equipment (อุปกรณ์)',
  OTHER = 'Other (อื่นๆ)'
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: Category;
  timestamp: number;
  taxId?: string;
  address?: string;
  note?: string;
}

export interface ScanResult {
  date: string;
  merchant: string;
  amount: number;
  category: Category;
  taxId?: string;
  address?: string;
  note?: string;
}

export interface IconProps {
  className?: string;
}
