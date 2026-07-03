import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'admin_active_page'

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: {
    activePage: localStorage.getItem(STORAGE_KEY) || 'dashboard',
  },
  reducers: {
    setActivePage(state, action) {
      state.activePage = action.payload
      localStorage.setItem(STORAGE_KEY, action.payload)
    },
  },
})

export const { setActivePage } = navigationSlice.actions
export default navigationSlice.reducer

// Selector
export const selectActivePage = (state) => state.navigation.activePage