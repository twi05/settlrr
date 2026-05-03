export interface Member {
    id: string;
    name: string;
    upiId?: string;
    groupId: string;
    createdAt: number;
  }
  
  export interface Transaction {
    id: string;
    groupId: string;
    paidBy: string; // memberId
    amount: number;
    splitBetween: string[]; // memberIds
    createdAt: number;
  }
  
  export interface Group {
    id: string;
    name: string;
    createdAt: number;
  }

  export type BalanceMap = Record<string, number>;