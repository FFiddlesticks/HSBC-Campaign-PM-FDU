// src/store/features/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CounterState {
  newDashBoardData:any
}

const initialState: CounterState = {
  newDashBoardData:[[],[],[],[]]
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    updateNewDashBoardData: (state, action: PayloadAction<any>) => {
      state. newDashBoardData= action.payload
    },
  }
})

export const { updateNewDashBoardData } = counterSlice.actions
export default counterSlice.reducer