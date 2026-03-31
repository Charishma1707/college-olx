import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import {BASE_URL} from "@/store/common"

const RECO_API = ""; // Uses same origin, /reco-api proxy

const initialState = {
  isLoading: false,
  searchResults: [],
  searchError: null,
  lastQuery: null,
  smartSuggestCategories: [],
  smartSuggestLoading: false,
};

export const getSearchResults = createAsyncThunk(
  "/order/getSearchResults",
  async (keyword) => {
    const query = typeof keyword === "string" ? keyword.trim() : "";
    const response = await axios.get(
      `${BASE_URL}/shop/search/${encodeURIComponent(query)}`
    );
    return response.data;
  }
);

export const smartSuggest = createAsyncThunk(
  "/shop/smartSuggest",
  async (query) => {
    const response = await axios.post(
      `${RECO_API}/reco-api/api/smart-suggest`,
      { query: query.trim() },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  }
);

export const multimodalSearch = createAsyncThunk(
  "/shop/multimodalSearch",
  async ({ textQuery, imageFile }) => {
    if (imageFile) {
      const data = new FormData();
      data.append("image", imageFile);
      if (textQuery && typeof textQuery === "string" && textQuery.trim()) {
        data.append("textQuery", textQuery.trim());
      }
      const response = await axios.post(
        `${BASE_URL}/shop/products/multimodal-search`,
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    }

    const response = await axios.post(
      `${BASE_URL}/shop/products/multimodal-search`,
      { textQuery },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  }
);

const searchSlice = createSlice({
  name: "searchSlice",
  initialState,
  reducers: {
    resetSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    resetSmartSuggest: (state) => {
      state.smartSuggestCategories = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSearchResults.pending, (state, action) => {
        state.isLoading = true;
        state.searchError = null;
        state.lastQuery = action.meta?.arg ?? null;
      })
      .addCase(getSearchResults.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchError = null;
        state.searchResults = action.payload?.data ?? [];
      })
      .addCase(getSearchResults.rejected, (state, action) => {
        state.isLoading = false;
        state.searchError = action.error?.message ?? "Search failed";
        state.searchResults = [];
      })
      .addCase(multimodalSearch.pending, (state) => {
        state.isLoading = true;
        state.searchError = null;
      })
      .addCase(multimodalSearch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload?.data ?? [];
      })
      .addCase(multimodalSearch.rejected, (state) => {
        state.isLoading = false;
        state.searchError = "Search failed. Please try again.";
        state.searchResults = [];
      })
      .addCase(smartSuggest.pending, (state) => {
        state.smartSuggestLoading = true;
      })
      .addCase(smartSuggest.fulfilled, (state, action) => {
        state.smartSuggestLoading = false;
        state.smartSuggestCategories = action.payload?.categories ?? [];
      })
      .addCase(smartSuggest.rejected, (state) => {
        state.smartSuggestLoading = false;
        state.smartSuggestCategories = [];
      });
  },
});

export const { resetSearchResults, resetSmartSuggest } = searchSlice.actions;

export default searchSlice.reducer;