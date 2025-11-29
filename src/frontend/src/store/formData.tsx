// src/store/features/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CounterState {
  isUpload:boolean
}

const initialState: CounterState = {
  isUpload:false
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    updateUploadStatus: (state, action: PayloadAction<boolean>) => {
      state. isUpload= action.payload
    },
  }
})

export const { updateUploadStatus } = counterSlice.actions
export default counterSlice.reducer