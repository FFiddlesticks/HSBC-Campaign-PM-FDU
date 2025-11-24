// src/store/features/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CounterState {
  id?: number,
  info:any,
}

const initialState: CounterState = {
  id: undefined,
  info:{}
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    updateId: (state, action: PayloadAction<number>) => {
      state.id = action.payload
    },
    updateInfo:(state, action: PayloadAction<any>)=>{
        state.info = action.payload
    }
  }
})

export const { updateId } = counterSlice.actions
export default counterSlice.reducer