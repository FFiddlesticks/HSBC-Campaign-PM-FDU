// src/store/features/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { dataSourceListPre } from '../const/dashBoardData'

interface CounterState {
  newDashBoardData:any,
  dataSourceListState:any
}

const initialState: CounterState = {
  newDashBoardData:[{},{},{},{}],
  dataSourceListState:dataSourceListPre
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    updateNewDashBoardData: (state, action: PayloadAction<any>) => {
      state. newDashBoardData= action.payload
    },
    updateDataSourceListState:(state,action: PayloadAction<any>)=>{
      state.dataSourceListState =action.payload
    }
  }
})

export const { updateNewDashBoardData,updateDataSourceListState } = counterSlice.actions
export default counterSlice.reducer