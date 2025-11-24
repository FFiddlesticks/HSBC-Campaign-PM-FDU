// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import formData from './formData'

export const store = configureStore({
  reducer: {
    data:formData,
  } // 后续添加reducer
})

// 导出RootState和Dispatch类型
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch