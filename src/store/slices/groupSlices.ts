import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Group, Member, Transaction } from "@/types";


interface GroupState {
    group: Group | null;
    members: Member[];
    transactions: Transaction[];    
}

const initialState: GroupState = {
    group: null,
    members: [],
    transactions: [],
}

const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        setGroup: (state, action: PayloadAction<Group>) => {
            state.group = action.payload;
        },
        setMembers: (state, action: PayloadAction<Member[]>) => {
            state.members = action.payload;
        },
        setTransactions: (state, action: PayloadAction<Transaction[]>) => {
            state.transactions = action.payload;
        },
        addMember: (state, action: PayloadAction<Member>) => {
            state.members.push(action.payload);
        },
        addTransaction: (state, action: PayloadAction<Transaction>) => {
            state.transactions.push(action.payload);
        },
        updateMember: (state, action: PayloadAction<Member>) => {
            const { id, ...rest } = action.payload;
            const member = state.members.find(member => member.id === id);
            if (member) {
                Object.assign(member, rest);
            }
        },
        updateTransaction: (state, action: PayloadAction<Transaction>) => {
            const { id, ...rest } = action.payload;
            const transaction = state.transactions.find(transaction => transaction.id === id);
            if (transaction) {
                Object.assign(transaction, rest);
            }
        },
        deleteMember: (state, action: PayloadAction<string>) => {
            state.members= state.members.filter(member => member.id !== action.payload);
        },
        deleteTransaction: (state, action: PayloadAction<string>) => {
            state.transactions= state.transactions.filter(transaction => transaction.id !== action.payload);
        },
        resetGroup: (state) => {
            state.group = null;
            state.members = [];
            state.transactions = [];
        },
    },
})

export const {
    setGroup,
    setMembers,
    setTransactions,
    addMember,
    addTransaction,
    updateMember,
    updateTransaction,
    deleteMember,
    deleteTransaction,
    resetGroup,
  } = groupSlice.actions;
  
  export default groupSlice.reducer;